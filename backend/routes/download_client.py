from flask import Blueprint, jsonify, request, session, current_app
from decorators import login_required
from models import UserSetting
from extensions import db
import transmission_rpc
import requests
import json

download_client_bp = Blueprint('download_client', __name__)

def get_client_config(user_id):
    setting = UserSetting.query.filter_by(user_id=user_id, key='downloadClientConfig').first()
    if not setting or not setting.value:
        return None
    try:
        config = json.loads(setting.value)
        return config
    except json.JSONDecodeError:
        return None

def get_transmission_client(config):
    if not config or config.get('type') != 'transmission' or not config.get('url'):
        return None
    
    url = config['url']
    username = config.get('username')
    password = config.get('password')

    try:
        # Parse URL to get host, port, and path
        parsed_url = requests.utils.urlparse(url)
        host = parsed_url.hostname
        port = parsed_url.port
        path = parsed_url.path

        client = transmission_rpc.Client(
            host=host,
            port=port,
            username=username,
            password=password,
            path=path
        )
        return client
    except Exception as e:
        current_app.logger.error(f"Failed to create Transmission client: {e}")
        return None

@download_client_bp.route("/download-client/test-connection", methods=["POST"])
@login_required
def test_download_client_connection():
    user_id = session.get('user_id')
    data = request.get_json()
    
    client_type = data.get('type')
    url = data.get('url')
    username = data.get('username')
    password = data.get('password')

    if client_type == 'transmission':
        try:
            client = get_transmission_client({'type': 'transmission', 'url': url, 'username': username, 'password': password})
            if client:
                client.get_session_stats() # A simple call to test connection
                return jsonify({"success": True, "message": "Connection successful."})
            else:
                return jsonify({"success": False, "error": "Failed to initialize Transmission client. Check URL."}), 400
        except transmission_rpc.error.TransmissionError as e:
            return jsonify({"success": False, "error": f"Transmission error: {e}"}), 400
        except requests.exceptions.ConnectionError:
            return jsonify({"success": False, "error": "Connection refused. Is the client running and accessible?"}), 400
        except Exception as e:
            return jsonify({"success": False, "error": f"An unexpected error occurred: {e}"}), 500
    
    return jsonify({"success": False, "error": "Unsupported client type."}), 400

@download_client_bp.route("/download-client/torrents", methods=["GET"])
@login_required
def get_torrents():
    user_id = session.get('user_id')
    config = get_client_config(user_id)
    
    if not config or config.get('type') == 'none':
        return jsonify({"error": "Download client not configured."}), 400

    if config.get('type') == 'transmission':
        client = get_transmission_client(config)
        if not client:
            return jsonify({"error": "Failed to connect to Transmission. Check settings."}), 500
        try:
            torrents = client.get_torrents()
            result = []
            for t in torrents:
                result.append({
                    "id": t.id,
                    "name": t.name,
                    "status": t.status,
                    "progress": t.progress,
                    "size_when_done": t.sizeWhenDone,
                    "rate_download": t.rateDownload,
                    "rate_upload": t.rateUpload,
                    "eta": t.eta,
                    "upload_ratio": t.uploadRatio,
                    "added_date": t.date_added.isoformat() if t.date_added else None,
                })
            return jsonify(result)
        except transmission_rpc.error.TransmissionError as e:
            return jsonify({"error": f"Transmission error: {e}"}), 500
        except Exception as e:
            current_app.logger.error(f"Error fetching torrents from Transmission: {e}")
            return jsonify({"error": f"An unexpected error occurred: {e}"}), 500
    
    return jsonify({"error": "Unsupported client type."}), 400

@download_client_bp.route("/download-client/add-torrent", methods=["POST"])
@login_required
def add_torrent():
    user_id = session.get('user_id')
    config = get_client_config(user_id)
    
    if not config or config.get('type') == 'none':
        return jsonify({"error": "Download client not configured."}), 400

    data = request.get_json()
    magnet_link = data.get('magnet_link')
    torrent_file_base64 = data.get('torrent_file_base64')

    if not magnet_link and not torrent_file_base64:
        return jsonify({"error": "Magnet link or torrent file is required."}), 400

    if config.get('type') == 'transmission':
        client = get_transmission_client(config)
        if not client:
            return jsonify({"error": "Failed to connect to Transmission. Check settings."}), 500
        try:
            if magnet_link:
                torrent = client.add_torrent(magnet_link)
            elif torrent_file_base64:
                # Transmission RPC expects base64 encoded torrent file content
                torrent = client.add_torrent(torrent_file_base64)
            
            return jsonify({"success": True, "id": torrent.id, "name": torrent.name})
        except transmission_rpc.error.TransmissionError as e:
            return jsonify({"error": f"Transmission error: {e}"}), 500
        except Exception as e:
            current_app.logger.error(f"Error adding torrent to Transmission: {e}")
            return jsonify({"error": f"An unexpected error occurred: {e}"}), 500
    
    return jsonify({"error": "Unsupported client type."}), 400

@download_client_bp.route("/download-client/torrents/<int:torrent_id>/<action>", methods=["POST"])
@login_required
def manage_torrent(torrent_id, action):
    user_id = session.get('user_id')
    config = get_client_config(user_id)
    
    if not config or config.get('type') == 'none':
        return jsonify({"error": "Download client not configured."}), 400

    if config.get('type') == 'transmission':
        client = get_transmission_client(config)
        if not client:
            return jsonify({"error": "Failed to connect to Transmission. Check settings."}), 500
        try:
            torrent = client.get_torrent(torrent_id)
            if action == 'start':
                torrent.start()
            elif action == 'stop':
                torrent.stop()
            elif action == 'remove':
                client.remove_torrent(torrent_id, delete_data=False) # Keep data by default
            elif action == 'remove-and-delete-data':
                client.remove_torrent(torrent_id, delete_data=True)
            elif action == 'verify':
                torrent.verify_local_data()
            elif action == 'reannounce':
                torrent.reannounce()
            else:
                return jsonify({"error": "Invalid torrent action."}), 400
            
            return jsonify({"success": True, "message": f"Torrent action '{action}' successful."})
        except transmission_rpc.error.TransmissionError as e:
            return jsonify({"error": f"Transmission error: {e}"}), 500
        except Exception as e:
            current_app.logger.error(f"Error managing torrent in Transmission: {e}")
            return jsonify({"error": f"An unexpected error occurred: {e}"}), 500
    
    return jsonify({"error": "Unsupported client type."}), 400