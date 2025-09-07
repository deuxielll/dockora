from flask import Blueprint, jsonify, request, session, current_app
from decorators import login_required
from models import UserSetting
from extensions import db
from qbittorrentapi import Client
import json
from urllib.parse import urlparse

download_clients_bp = Blueprint('download_clients', __name__)

def get_qbittorrent_client(user_id):
    """Helper to get qBittorrent client instance from user settings."""
    setting = UserSetting.query.filter_by(user_id=user_id, key='downloadClientConfig').first()
    if not setting or not setting.value:
        return None, "qBittorrent settings not configured."

    try:
        config = json.loads(setting.value)
        if config.get('type') != 'qbittorrent':
            return None, "qBittorrent is not the selected download client."

        qb_url = config.get('url')
        qb_username = config.get('username')
        qb_password = config.get('password')

        if not qb_url:
            return None, "qBittorrent URL is missing."

        parsed_url = urlparse(qb_url)
        qb = Client(host=parsed_url.hostname, port=parsed_url.port, username=qb_username, password=qb_password)
        qb.auth_log_in()
        return qb, None
    except json.JSONDecodeError:
        return None, "Invalid qBittorrent configuration format."
    except Exception as e:
        current_app.logger.error(f"Failed to initialize qBittorrent client: {e}")
        return None, f"Failed to connect to qBittorrent: {e}"

@download_clients_bp.route("/download-clients/settings", methods=["GET"])
@login_required
def get_download_client_settings():
    user_id = session.get('user_id')
    setting = UserSetting.query.filter_by(user_id=user_id, key='downloadClientConfig').first()
    if setting and setting.value:
        try:
            return jsonify(json.loads(setting.value))
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid download client configuration."}), 500
    return jsonify({"type": "none", "url": "", "username": "", "password": ""})

@download_clients_bp.route("/download-clients/settings", methods=["POST"])
@login_required
def set_download_client_settings():
    user_id = session.get('user_id')
    data = request.get_json()

    # Validate incoming data
    client_type = data.get('type')
    if client_type not in ['none', 'qbittorrent']:
        return jsonify({"error": "Invalid download client type."}), 400
    
    if client_type == 'qbittorrent':
        if not data.get('url'):
            return jsonify({"error": "qBittorrent URL is required."}), 400

    setting = UserSetting.query.filter_by(user_id=user_id, key='downloadClientConfig').first()
    if setting:
        setting.value = json.dumps(data)
    else:
        setting = UserSetting(user_id=user_id, key='downloadClientConfig', value=json.dumps(data))
        db.session.add(setting)
    
    db.session.commit()
    return jsonify({"message": "Download client settings saved successfully."})

@download_clients_bp.route("/download-clients/qbittorrent/downloads", methods=["GET"])
@login_required
def get_qbittorrent_downloads():
    user_id = session.get('user_id')
    qb, error = get_qbittorrent_client(user_id)
    if error:
        return jsonify({"error": error}), 500

    try:
        torrents = qb.torrents_info(status_filter='downloading') # Only get active downloads
        
        # Sort by progress (descending) and limit to 7
        torrents.sort(key=lambda t: t.progress, reverse=True)
        active_downloads = torrents[:7]

        result = []
        for t in active_downloads:
            result.append({
                "hash": t.hash,
                "name": t.name,
                "progress": round(t.progress * 100, 1), # Convert to percentage
                "download_speed": t.dlspeed,
                "upload_speed": t.upspeed,
                "state": t.state,
                "size": t.size,
                "downloaded": t.downloaded,
                "uploaded": t.uploaded,
            })
        return jsonify(result)
    except Exception as e:
        current_app.logger.error(f"Failed to fetch qBittorrent downloads: {e}")
        return jsonify({"error": f"Failed to fetch qBittorrent downloads: {e}"}), 500