from flask import Blueprint, jsonify, request, session, current_app, Response, stream_with_context
import psutil
import requests
import json
import time
import socket
from urllib.parse import urlparse
from models import UserSetting, SystemSetting, NetworkUsage
from decorators import login_required, admin_required
from extensions import db
import subprocess
import re
from datetime import datetime, date, timedelta
from sqlalchemy import func
import os
import paramiko # New import

system_bp = Blueprint('system', __name__)

# Global state for network speed calculation and session usage
last_net_io = psutil.net_io_counters()
last_time = time.time()
session_upload_total = 0
session_download_total = 0

@system_bp.route("/system/smtp-status", methods=["GET"])
def get_smtp_status():
    required_keys = ['smtp_server', 'smtp_port', 'smtp_sender_email']
    settings = SystemSetting.query.filter(SystemSetting.key.in_(required_keys)).all()
    
    found_keys = {s.key: s.value for s in settings if s.value}
    
    is_configured = all(key in found_keys for key in required_keys)
    
    return jsonify({"configured": is_configured})

@system_bp.route("/system/stats", methods=["GET"])
@login_required
def system_stats():
    memory_info = psutil.virtual_memory()
    disk_info = psutil.disk_usage('/')
    return jsonify({
        "cpu_usage": psutil.cpu_percent(interval=1),
        "memory_usage_percent": memory_info.percent,
        "memory_total": memory_info.total,
        "memory_used": memory_info.used,
        "disk_usage_percent": disk_info.percent,
        "disk_total": disk_info.total,
        "disk_used": disk_info.used,
    })

@system_bp.route("/system/network-stats", methods=["GET"])
@login_required
def network_stats():
    global last_net_io, last_time, session_upload_total, session_download_total

    current_time = time.time()
    current_net_io = psutil.net_io_counters()

    elapsed_time = current_time - last_time
    if elapsed_time == 0:
        elapsed_time = 1

    bytes_sent_interval = current_net_io.bytes_sent - last_net_io.bytes_sent
    bytes_recv_interval = current_net_io.bytes_recv - last_net_io.bytes_recv

    upload_speed = bytes_sent_interval / elapsed_time
    download_speed = bytes_recv_interval / elapsed_time

    last_net_io = current_net_io
    last_time = current_time

    # Update session totals
    session_upload_total += bytes_sent_interval
    session_download_total += bytes_recv_interval

    # Initialize network details
    public_ip = "N/A"
    local_ip = "N/A"
    subnet_mask = "N/A"
    gateway = "N/A"
    dns_servers = []
    connection_type = "unknown"
    location = "N/A"
    online_status = False
    ping_latency = "N/A"
    packet_loss = "N/A"
    errors = [] # List to collect detailed errors

    # Check online status
    try:
        requests.get('http://www.google.com', timeout=1)
        online_status = True
    except requests.RequestException as e:
        current_app.logger.warning(f"Online status check failed: {e}")
        errors.append(f"Online check failed: {e}")
        online_status = False

    # Get public IP and location
    if online_status:
        try:
            geo_res = requests.get('http://ip-api.com/json/?fields=status,message,country,city,query', timeout=2)
            geo_res.raise_for_status()
            geo_data = geo_res.json()
            if geo_data.get('status') == 'success':
                public_ip = geo_data.get('query', 'N/A')
                city = geo_data.get('city')
                country = geo_data.get('country')
                if city and country:
                    location = f"{city}, {country}"
            else:
                errors.append(f"Public IP/location API returned status: {geo_data.get('status')}")
        except requests.RequestException as e:
            current_app.logger.warning(f"Public IP/location lookup failed: {e}")
            errors.append(f"Public IP/location lookup failed: {e}")
            # Fallback to local IP as 'public' if external fails
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                public_ip = s.getsockname()[0]
                s.close()
            except Exception as e:
                current_app.logger.warning(f"Local IP fallback failed: {e}")
                errors.append(f"Local IP fallback failed: {e}")

        # Latency and Packet Loss using ping
        try:
            ping_output = subprocess.run(['ping', '-c', '4', '-W', '1', '8.8.8.8'], capture_output=True, text=True, check=True)
            
            latency_match = re.search(r'min/avg/max/mdev = [\d.]+/([\d.]+)/[\d.]+/[\d.]+ ms', ping_output.stdout)
            if latency_match:
                ping_latency = float(latency_match.group(1))
            else:
                errors.append("Ping latency not found in output.")

            loss_match = re.search(r'(\d+)% packet loss', ping_output.stdout)
            if loss_match:
                packet_loss = float(loss_match.group(1))
            else:
                errors.append("Ping packet loss not found in output.")

        except (subprocess.CalledProcessError, FileNotFoundError, AttributeError) as e:
            current_app.logger.warning(f"Ping command failed or output not parsed: {e}")
            errors.append(f"Ping command failed: {e}")
            ping_latency = "N/A"
            packet_loss = "N/A"
        except Exception as e:
            current_app.logger.error(f"Error during ping: {e}")
            errors.append(f"Error during ping: {e}")
            ping_latency = "N/A"
            packet_loss = "N/A"

    # Get local IP, subnet, gateway, connection type
    try:
        stats_if = psutil.net_if_stats()
        addrs = psutil.net_if_addrs()
        active_interface = None
        
        for interface, addr_list in addrs.items():
            if interface in stats_if and stats_if[interface].isup:
                for addr in addr_list:
                    if addr.family == socket.AF_INET and not addr.address.startswith("127."):
                        active_interface = interface
                        local_ip = addr.address
                        subnet_mask = addr.netmask
                        break
            if active_interface:
                break
        
        if active_interface:
            if any(keyword in active_interface.lower() for keyword in ['wlan', 'wi-fi', 'wlp']):
                connection_type = 'wifi'
            elif any(keyword in active_interface.lower() for keyword in ['eth', 'enp', 'ethernet']):
                connection_type = 'lan'
            
            # Try to get gateway using 'ip route show default'
            try:
                gateway_output = subprocess.run(['ip', 'route', 'show', 'default'], capture_output=True, text=True, check=True)
                gateway_match = re.search(r'default via (\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', gateway_output.stdout)
                if gateway_match:
                    gateway = gateway_match.group(1)
                else:
                    errors.append("Gateway not found in 'ip route show default' output.")
            except (subprocess.CalledProcessError, FileNotFoundError) as e:
                current_app.logger.warning(f"Failed to get gateway via 'ip route': {e}")
                errors.append(f"Failed to get gateway (ip route command failed).")
            except Exception as e:
                current_app.logger.warning(f"Failed to get gateway: {e}")
                errors.append(f"Failed to get gateway: {e}")

        # Get DNS servers from /etc/resolv.conf (Linux-specific)
        if os.path.exists('/etc/resolv.conf'):
            try:
                with open('/etc/resolv.conf', 'r') as f:
                    for line in f:
                        if line.startswith('nameserver'):
                            parts = line.split()
                            if len(parts) > 1:
                                dns_servers.append(parts[1])
            except Exception as e:
                current_app.logger.warning(f"Failed to read DNS servers from resolv.conf: {e}")
                errors.append(f"Failed to read DNS servers: {e}")
    except Exception as e:
        current_app.logger.error(f"General network stats collection error: {e}")
        errors.append(f"General network stats collection error: {e}")

    # --- Daily/Monthly Usage Tracking ---
    user_id = session.get('user_id')
    today = date.today()
    daily_upload_total = 0
    daily_download_total = 0
    monthly_upload_total = 0
    monthly_download_total = 0

    if user_id:
        # Update daily usage
        daily_usage = NetworkUsage.query.filter_by(user_id=user_id, date=today).first()
        if not daily_usage:
            daily_usage = NetworkUsage(user_id=user_id, date=today)
            db.session.add(daily_usage)
        
        daily_usage.uploaded_bytes = (daily_usage.uploaded_bytes or 0) + bytes_sent_interval
        daily_usage.downloaded_bytes = (daily_usage.downloaded_bytes or 0) + bytes_recv_interval
        db.session.commit()

        daily_upload_total = daily_usage.uploaded_bytes
        daily_download_total = daily_usage.downloaded_bytes

        # Calculate monthly usage
        start_of_month = today.replace(day=1)
        monthly_usage_records = NetworkUsage.query.filter(
            NetworkUsage.user_id == user_id,
            NetworkUsage.date >= start_of_month,
            NetworkUsage.date <= today
        ).all()

        for record in monthly_usage_records:
            monthly_upload_total += record.uploaded_bytes
            monthly_download_total += record.downloaded_bytes

    return jsonify({
        "upload_speed": upload_speed,
        "download_speed": download_speed,
        "public_ip": public_ip,
        "local_ip": local_ip,
        "subnet_mask": subnet_mask,
        "gateway": gateway,
        "dns_servers": dns_servers,
        "connection_type": connection_type,
        "location": location,
        "online_status": online_status,
        "ping_latency": ping_latency,
        "packet_loss": packet_loss,
        "session_upload_total": session_upload_total,
        "session_download_total": session_download_total,
        "daily_upload_total": daily_upload_total,
        "daily_download_total": daily_download_total,
        "monthly_upload_total": monthly_upload_total,
        "monthly_download_total": monthly_download_total,
        "errors": errors
    })

qbit_session = requests.Session()
qbit_auth_cookie = None
transmission_session_id = None

def qbittorrent_login(config):
    global qbit_auth_cookie, qbit_session
    if qbit_auth_cookie: return True
    try:
        url = config.get('url')
        username = config.get('username', '')
        password = config.get('password', '')
        if not url: return False

        parsed_url = urlparse(url)
        origin_and_referer = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
        login_headers = {
            'Referer': origin_and_referer,
            'Origin': origin_and_referer
        }
        res = qbit_session.post(
            f"{url.rstrip('/')}/api/v2/auth/login", 
            data={'username': username, 'password': password},
            headers=login_headers,
            timeout=5
        )
        if res.ok and res.text == "Ok.":
            qbit_auth_cookie = res.cookies.get('SID')
            # Only set the Referer for subsequent requests in the session
            qbit_session.headers.update({'Referer': origin_and_referer})
            return True
    except (requests.RequestException, KeyError): pass
    return False

def transmission_request(config, method, args=None):
    global transmission_session_id
    base_url = config.get('url')
    if not base_url:
        raise ValueError("Transmission URL is not configured.")
        
    url = f"{base_url.rstrip('/')}/transmission/rpc"
    headers = {'Content-Type': 'application/json'}
    if transmission_session_id: headers['X-Transmission-Session-Id'] = transmission_session_id
    payload = {"method": method, "arguments": args or {}}
    auth = (config.get('username'), config.get('password')) if config.get('username') else None
    
    try:
        res = requests.post(url, json=payload, headers=headers, auth=auth, timeout=5)
        if res.status_code == 409:
            transmission_session_id = res.headers.get('X-Transmission-Session-Id')
            headers['X-Transmission-Session-Id'] = transmission_session_id
            res = requests.post(url, json=payload, headers=headers, auth=auth, timeout=5)
        res.raise_for_status()
        return res.json()
    except requests.RequestException as e: raise e

@system_bp.route("/download-client/stats", methods=["GET"])
@login_required
def get_download_client_stats():
    global qbit_auth_cookie, qbit_session
    config_setting = UserSetting.query.filter_by(user_id=session['user_id'], key='downloadClientConfig').first()
    if not config_setting or not config_setting.value: return jsonify({"error": "Not configured."}), 404
    try: config = json.loads(config_setting.value)
    except json.JSONDecodeError: return jsonify({"error": "Invalid configuration."}), 500

    client_type = config.get('type')
    if not client_type or client_type == 'none': return jsonify({"error": "Not configured."}), 404

    try:
        if client_type == 'qbittorrent':
            if not qbittorrent_login(config): 
                qbit_auth_cookie = None
                qbit_session = requests.Session()
                return jsonify({"error": "qBittorrent login failed. Check URL, username, and password."}), 500
            
            res = qbit_session.get(f"{config.get('url', '').rstrip('/')}/api/v2/transfer/info", timeout=5)
            res.raise_for_status()
            stats_data = res.json()
            return jsonify({"dl_speed": stats_data.get('dl_info_speed', 0), "up_speed": stats_data.get('up_info_speed', 0)})
        
        elif client_type == 'transmission':
            stats = transmission_request(config, 'session-stats').get('arguments', {})
            return jsonify({"dl_speed": stats.get('downloadSpeed', 0), "up_speed": stats.get('uploadSpeed', 0)})
        
        else: return jsonify({"error": "Unsupported client type."}), 400
    except (requests.RequestException, json.JSONDecodeError, KeyError, ValueError) as e:
        if client_type == 'qbittorrent':
            qbit_auth_cookie = None
            qbit_session = requests.Session()
        return jsonify({"error": f"Failed to connect to download client: {str(e)}"}), 500

def map_transmission_status(status):
    return {
        0: 'paused', 1: 'queued', 2: 'checking',
        3: 'queued', 4: 'downloading', 5: 'queued',
        6: 'seeding'
    }.get(status, 'unknown')

@system_bp.route("/download-client/torrents", methods=["GET"])
@login_required
def get_torrents():
    global qbit_auth_cookie, qbit_session
    config_setting = UserSetting.query.filter_by(user_id=session['user_id'], key='downloadClientConfig').first()
    if not config_setting or not config_setting.value: return jsonify({"error": "Not configured."}), 404
    try: config = json.loads(config_setting.value)
    except json.JSONDecodeError: return jsonify({"error": "Invalid configuration."}), 500

    client_type = config.get('type')
    try:
        if client_type == 'qbittorrent':
            if not qbittorrent_login(config):
                qbit_auth_cookie = None
                qbit_session = requests.Session()
                return jsonify({"error": "qBittorrent login failed. Check URL, username, and password."}), 500
            params = {'filter': 'active', 'sort': 'added_on', 'reverse': 'true', 'limit': 5}
            res = qbit_session.get(f"{config.get('url', '').rstrip('/')}/api/v2/torrents/info", params=params, timeout=5)
            res.raise_for_status()
            torrents_data = res.json()
            return jsonify(torrents_data)
        
        elif client_type == 'transmission':
            fields = ["id", "hashString", "name", "percentDone", "totalSize", "status", "rateDownload", "rateUpload", "peersConnected", "peersSendingToUs", "eta", "addedDate"]
            data = transmission_request(config, 'torrent-get', {"fields": fields}).get('arguments', {}).get('torrents', [])
            
            active_torrents = [t for t in data if t['status'] != 0]
            sorted_torrents = sorted(active_torrents, key=lambda x: x['addedDate'], reverse=True)
            
            normalized_torrents = [{
                "hash": t['hashString'], "name": t['name'], "progress": t['percentDone'],
                "size": t['totalSize'], "state": map_transmission_status(t['status']),
                "dlspeed": t['rateDownload'], "upspeed": t['rateUpload'],
                "seeds": t['peersSendingToUs'], "peers": t['peersConnected'], "eta": t['eta']
            } for t in sorted_torrents[:5]]
            return jsonify(normalized_torrents)

    except (requests.RequestException, json.JSONDecodeError, KeyError, ValueError) as e:
        if client_type == 'qbittorrent':
            qbit_auth_cookie = None
            qbit_session = requests.Session()
        return jsonify({"error": f"Failed to connect to download client: {str(e)}"}), 500
    
    return jsonify([])

@system_bp.route("/download-client/action", methods=["POST"])
@login_required
def torrent_action():
    config_setting = UserSetting.query.filter_by(user_id=session['user_id'], key='downloadClientConfig').first()
    if not config_setting or not config_setting.value: return jsonify({"error": "Not configured."}), 404
    try: config = json.loads(config_setting.value)
    except json.JSONDecodeError: return jsonify({"error": "Invalid configuration."}), 500
    
    data = request.get_json()
    hashes = data.get('hash')
    action = data.get('action')

    if not hashes or not action: return jsonify({"error": "Hash and action are required."}), 400

    client_type = config.get('type')
    try:
        if client_type == 'qbittorrent':
            if not qbittorrent_login(config):
                qbit_auth_cookie = None
                qbit_session = requests.Session()
                return jsonify({"error": "qBittorrent login failed. Check URL, username, and password."}), 500
            action_map = {'pause': 'pause', 'resume': 'resume', 'remove': 'delete'}
            if action not in action_map: return jsonify({"error": "Invalid action."}), 400
            url = f"{config.get('url', '').rstrip('/')}/api/v2/torrents/{action_map[action]}"
            payload = {'hashes': hashes}
            if action == 'remove': payload['deleteFiles'] = 'false'
            res = qbit_session.post(url, data=payload, timeout=5)
            res.raise_for_status()
            return jsonify({"success": True})

        elif client_type == 'transmission':
            action_map = {'pause': 'torrent-stop', 'resume': 'torrent-start', 'remove': 'torrent-remove'}
            if action not in action_map: return jsonify({"error": "Invalid action."}), 400
            
            all_torrents = transmission_request(config, 'torrent-get', {"fields": ["id", "hashString"]}).get('arguments', {}).get('torrents', [])
            target_id = next((t['id'] for t in all_torrents if t['hashString'] == hashes), None)
            if not target_id: return jsonify({"error": "Torrent not found."}), 404

            args = {"ids": [target_id]}
            if action == 'remove': args['delete-local-data'] = False
            
            transmission_request(config, action_map[action], args)
            return jsonify({"success": True})

    except (requests.RequestException, json.JSONDecodeError, KeyError, ValueError) as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Unsupported client type."}), 400

@system_bp.route("/system/smtp-settings", methods=["GET"])
@admin_required
def get_smtp_settings():
    settings = SystemSetting.query.filter(SystemSetting.key.like('smtp_%')).all()
    settings_dict = {s.key: s.value for s in settings}
    return jsonify(settings_dict)

@system_bp.route("/system/smtp-settings", methods=["POST"])
@admin_required
def set_smtp_settings():
    data = request.get_json()
    allowed_keys = ['smtp_server', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_sender_email', 'smtp_use_tls']
    
    for key, value in data.items():
        if key in allowed_keys:
            setting = SystemSetting.query.filter_by(key=key).first()
            if setting:
                setting.value = str(value)
            else:
                setting = SystemSetting(key=key, value=str(value))
                db.session.add(setting)
    
    db.session.commit()
    return jsonify({"message": "SMTP settings saved successfully."})

@system_bp.route("/system/ssh-settings", methods=["GET"])
@admin_required
def get_ssh_settings():
    settings = SystemSetting.query.filter(SystemSetting.key.like('ssh_%')).all()
    settings_dict = {s.key: s.value for s in settings}
    return jsonify(settings_dict)

@system_bp.route("/system/ssh-settings", methods=["POST"])
@admin_required
def set_ssh_settings():
    data = request.get_json()
    allowed_keys = ['ssh_host', 'ssh_port', 'ssh_username', 'ssh_password'] # No private key for now
    
    for key, value in data.items():
        if key in allowed_keys:
            setting = SystemSetting.query.filter_by(key=key).first()
            if setting:
                setting.value = str(value)
            else:
                setting = SystemSetting(key=key, value=str(value))
                db.session.add(setting)
    
    db.session.commit()
    return jsonify({"message": "SSH settings saved successfully."})

@system_bp.route("/system/ssh/execute-command", methods=["POST"])
@admin_required
def execute_ssh_command():
    data = request.get_json()
    host = data.get('host')
    port = int(data.get('port', 22))
    username = data.get('username')
    password = data.get('password')
    command = data.get('command')

    if not all([host, username, command]):
        return jsonify({"error": "Host, username, and command are required."}), 400

    def generate_output():
        client = None
        try:
            yield "[DOCKORA_STREAM_INFO]Attempting SSH connection...\n"
            client = paramiko.SSHClient()
            client.load_system_host_keys()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            client.connect(hostname=host, port=port, username=username, password=password, timeout=10)
            yield f"[DOCKORA_STREAM_INFO]Connected to {username}@{host}:{port}. Executing command...\n"

            stdin, stdout, stderr = client.exec_command(command, get_pty=True)
            
            # Stream stdout
            for line in iter(stdout.readline, ""):
                yield line
            
            # Stream stderr
            for line in iter(stderr.readline, ""):
                yield f"[DOCKORA_STREAM_ERROR]{line}"

            exit_status = stdout.channel.recv_exit_status()
            if exit_status == 0:
                yield "[DOCKORA_STREAM_SUCCESS]Command executed successfully.\n"
            else:
                yield f"[DOCKORA_STREAM_ERROR]Command exited with status {exit_status}.\n"

        except paramiko.AuthenticationException:
            yield "[DOCKORA_STREAM_ERROR]Authentication failed. Check username and password.\n"
        except paramiko.SSHException as e:
            yield f"[DOCKORA_STREAM_ERROR]SSH connection or command execution failed: {e}\n"
        except socket.timeout:
            yield "[DOCKORA_STREAM_ERROR]Connection timed out. Host might be unreachable or port is closed.\n"
        except Exception as e:
            yield f"[DOCKORA_STREAM_ERROR]An unexpected error occurred: {e}\n"
        finally:
            if client:
                client.close()
                yield "[DOCKORA_STREAM_INFO]SSH connection closed.\n"

    return Response(stream_with_context(generate_output()), mimetype='text/plain')