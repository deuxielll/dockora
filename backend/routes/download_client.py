from flask import Blueprint, jsonify, request, session, current_app
import requests
import json
from urllib.parse import urlparse
from models import UserSetting
from decorators import login_required

download_client_bp = Blueprint('download_client', __name__)

# Global state for qBittorrent session
qbit_session = requests.Session()
qbit_auth_cookie = None
transmission_session_id = None

def qbittorrent_login(config):
    global qbit_auth_cookie, qbit_session
    url = config.get('url')
    username = config.get('username', '')
    password = config.get('password', '')

    if not url:
        raise ValueError("qBittorrent URL is not configured.")

    parsed_url = urlparse(url)
    origin_and_referer = f"{parsed_url.scheme}://{parsed_url.netloc}"
    
    login_headers = {
        'Referer': origin_and_referer,
        'Origin': origin_and_referer
    }

    try:
        res = qbit_session.post(
            f"{url.rstrip('/')}/api/v2/auth/login", 
            data={'username': username, 'password': password},
            headers=login_headers,
            timeout=5
        )
        res.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        if res.text == "Ok.":
            qbit_auth_cookie = res.cookies.get('SID')
            qbit_session.headers.update({'Referer': origin_and_referer})
            return True
        else:
            raise requests.exceptions.RequestException(f"qBittorrent login failed: {res.text}")

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403: # Forbidden, often means bad credentials
            raise ConnectionError("qBittorrent login failed: Invalid username or password.") from e
        else:
            raise ConnectionError(f"qBittorrent login failed with HTTP status {e.response.status_code}.") from e
    except requests.RequestException as e:
        raise ConnectionError(f"qBittorrent login failed due to network error: {e}") from e
    except KeyError:
        raise ConnectionError("qBittorrent login failed due to unexpected response format.")

def transmission_request(config, method, args=None):
    global transmission_session_id
    base_url = config.get('url')
    if not base_url:
        raise ValueError("Transmission URL is not configured.")
        
    url = f"{base_url.rstrip('/')}/transmission/rpc"
    headers = {'Content-Type': 'application/json'}
    if transmission_session_id: headers['X-Transmission-Session-Id'] = transmission_session_id
    auth = (config.get('username'), config.get('password')) if config.get('username') else None
    payload = {"method": method, "arguments": args or {}}
    
    try:
        res = requests.post(url, json=payload, headers=headers, auth=auth, timeout=5)
        if res.status_code == 409:
            transmission_session_id = res.headers.get('X-Transmission-Session-Id')
            headers['X-Transmission-Session-Id'] = transmission_session_id
            res = requests.post(url, json=payload, headers=headers, auth=auth, timeout=5)
        res.raise_for_status()
        return res.json()
    except requests.RequestException as e:
        current_app.logger.error(f"Transmission RPC request failed due to network error: {e}")
        raise ConnectionError("Failed to connect to Transmission client (network error).") from e
    except Exception as e:
        current_app.logger.error(f"Transmission RPC request failed: {e}")
        raise e

@download_client_bp.route("/download-client/stats", methods=["GET"])
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
            try:
                qbittorrent_login(config)
            except ConnectionError as e:
                qbit_auth_cookie = None # Clear cookie on login failure
                qbit_session = requests.Session() # Reset session
                return jsonify({"error": str(e)}), 500
            
            res = qbit_session.get(f"{config.get('url', '').rstrip('/')}/api/v2/transfer/info", timeout=5)
            res.raise_for_status()
            stats_data = res.json()
            return jsonify({"dl_speed": stats_data.get('dl_info_speed', 0), "up_speed": stats_data.get('up_info_speed', 0)})
        
        elif client_type == 'transmission':
            stats = transmission_request(config, 'session-stats').get('arguments', {})
            return jsonify({"dl_speed": stats.get('downloadSpeed', 0), "up_speed": stats.get('uploadSpeed', 0)})
        
        else: return jsonify({"error": "Unsupported client type."}), 400
    except ConnectionError as e:
        if client_type == 'qbittorrent':
            qbit_auth_cookie = None
            qbit_session = requests.Session()
        return jsonify({"error": str(e)}), 500
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

@download_client_bp.route("/download-client/torrents", methods=["GET"])
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
            try:
                qbittorrent_login(config)
            except ConnectionError as e:
                qbit_auth_cookie = None
                qbit_session = requests.Session()
                return jsonify({"error": str(e)}), 500
            
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

    except ConnectionError as e:
        if client_type == 'qbittorrent':
            qbit_auth_cookie = None
            qbit_session = requests.Session()
        return jsonify({"error": str(e)}), 500
    except (requests.RequestException, json.JSONDecodeError, KeyError, ValueError) as e:
        if client_type == 'qbittorrent':
            qbit_auth_cookie = None
            qbit_session = requests.Session()
        return jsonify({"error": f"Failed to connect to download client: {str(e)}"}), 500
    
    return jsonify([])

@download_client_bp.route("/download-client/action", methods=["POST"])
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
            try:
                qbittorrent_login(config)
            except ConnectionError as e:
                qbit_auth_cookie = None
                qbit_session = requests.Session()
                return jsonify({"error": str(e)}), 500
            
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

    except ConnectionError as e:
        return jsonify({"error": str(e)}), 500
    except (requests.RequestException, json.JSONDecodeError, KeyError, ValueError) as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Unsupported client type."}), 400