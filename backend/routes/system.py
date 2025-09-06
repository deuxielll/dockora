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

system_bp = Blueprint('system', __name__)

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

    session_upload_total += bytes_sent_interval
    session_download_total += bytes_recv_interval

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
    errors = []

    try:
        requests.get('http://www.google.com', timeout=1)
        online_status = True
    except requests.RequestException as e:
        current_app.logger.warning(f"Online status check failed: {e}")
        errors.append("No internet connection")
        online_status = False

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
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                public_ip = s.getsockname()[0]
                s.close()
            except Exception as e:
                current_app.logger.warning(f"Local IP fallback failed: {e}")
                errors.append(f"Local IP fallback failed: {e}")

        try:
            ping_output = subprocess.run(['ping', '-c', '4', '-W', '1', '8.8.8.8'], capture_output=True, text=True, check=True)
            
            latency_match = re.search(r'min/avg/max/mdev = [\d.]+/([\d.]+)/[\d.]+/[.\d]+ ms', ping_output.stdout)
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
    else:
        public_ip = "N/A"
        location = "N/A"
        ping_latency = "N/A"
        packet_loss = "N/A"

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

    user_id = session.get('user_id')
    today = date.today()
    daily_upload_total = 0
    daily_download_total = 0
    monthly_upload_total = 0
    monthly_download_total = 0

    if user_id:
        daily_usage = NetworkUsage.query.filter_by(user_id=user_id, date=today).first()
        if not daily_usage:
            daily_usage = NetworkUsage(user_id=user_id, date=today)
            db.session.add(daily_usage)
        
        daily_usage.uploaded_bytes = (daily_usage.uploaded_bytes or 0) + bytes_sent_interval
        daily_usage.downloaded_bytes = (daily_usage.downloaded_bytes or 0) + bytes_recv_interval
        db.session.commit()

        daily_upload_total = daily_usage.uploaded_bytes
        daily_download_total = daily_usage.downloaded_bytes

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