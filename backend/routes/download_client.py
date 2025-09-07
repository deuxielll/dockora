from flask import Blueprint, jsonify, request, session, current_app
from models import UserSetting
from extensions import db
import requests
import os
import base64
import json # Import json module

download_client_bp = Blueprint('download_client', __name__)

def _get_qbittorrent_settings_for_user(user_id):
    """Retrieves qBittorrent connection settings for a given user."""
    # Fetch the single 'downloadClientConfig' setting which stores all qBittorrent details as JSON
    download_client_config_setting = UserSetting.query.filter_by(user_id=user_id, key='downloadClientConfig').first()
    
    config = {}
    if download_client_config_setting and download_client_config_setting.value:
        try:
            # Parse the JSON string value into a Python dictionary
            config = json.loads(download_client_config_setting.value)
        except json.JSONDecodeError:
            current_app.logger.error(f"Failed to parse downloadClientConfig for user {user_id}: {download_client_config_setting.value}")
            config = {} # Fallback to empty config on parse error

    return {
        'url': config.get('qbittorrentUrl'),
        'username': config.get('qbittorrentUsername'),
        'password': config.get('qbittorrentPassword')
    }

def _make_qbittorrent_request(user_id, endpoint, method='GET', data=None, files=None):
    """Helper to make authenticated requests to the qBittorrent WebUI API."""
    settings = _get_qbittorrent_settings_for_user(user_id)
    qb_url = settings.get('url')
    qb_username = settings.get('username')
    qb_password = settings.get('password')

    if not qb_url:
        raise ValueError("qBittorrent URL is not configured.")

    # Ensure URL ends with a slash for consistent path joining
    if not qb_url.endswith('/'):
        qb_url += '/'

    session_requests = requests.Session()
    
    # Attempt login if credentials are provided
    if qb_username and qb_password:
        login_url = f"{qb_url}api/v2/auth/login"
        login_data = {'username': qb_username, 'password': qb_password}
        try:
            login_response = session_requests.post(login_url, data=login_data, timeout=5)
            login_response.raise_for_status()
            if "Fails" in login_response.text: # qBittorrent returns "Fails" on login failure
                raise requests.exceptions.RequestException("qBittorrent login failed: Invalid credentials.")
        except requests.exceptions.RequestException as e:
            current_app.logger.error(f"qBittorrent login failed for user {user_id}: {e}")
            raise ValueError(f"qBittorrent login failed: {e}")

    full_url = f"{qb_url}{endpoint}"
    try:
        if method == 'GET':
            response = session_requests.get(full_url, params=data, timeout=10)
        elif method == 'POST':
            response = session_requests.post(full_url, data=data, files=files, timeout=30)
        else:
            raise ValueError("Unsupported HTTP method.")
        
        response.raise_for_status()
        return response.json() if response.headers.get('Content-Type', '').startswith('application/json') else response.text
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"qBittorrent API request failed for user {user_id} to {full_url}: {e}")
        raise ValueError(f"qBittorrent API request failed: {e}")

@download_client_bp.route("/downloads/qbittorrent/list", methods=["GET"])
def get_qbittorrent_downloads():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    try:
        # Get all torrents
        torrents_info = _make_qbittorrent_request(user_id, "api/v2/torrents/info")
        
        active_downloads = []
        completed_downloads = []

        for torrent in torrents_info:
            # Filter out torrents that are not in a downloading or seeding state for active list
            is_active = torrent['state'] in ['downloading', 'stalled_dl', 'checkingDL', 'metaDL', 'forced_dl', 'uploading', 'stalled_up', 'checkingUP', 'forced_up']
            
            # Calculate progress
            progress = torrent['progress'] * 100 # qBittorrent API returns 0-1
            
            # Calculate ETA (in seconds)
            eta_seconds = torrent['eta'] if torrent['eta'] != 8640000 else -1 # 8640000 is qBittorrent's "infinity" for ETA

            # Format speeds
            download_speed = torrent['dlspeed']
            upload_speed = torrent['upspeed']

            formatted_torrent = {
                'hash': torrent['hash'],
                'name': torrent['name'],
                'size': torrent['size'],
                'progress': round(progress, 2),
                'download_speed': download_speed,
                'upload_speed': upload_speed,
                'eta': eta_seconds,
                'state': torrent['state'],
                'category': torrent['category'],
                'ratio': round(torrent['ratio'], 2),
                'added_on': torrent['added_on'],
                'completion_on': torrent['completion_on'],
            }

            if is_active:
                active_downloads.append(formatted_torrent)
            else:
                completed_downloads.append(formatted_torrent)
        
        # Sort active downloads by progress (descending)
        active_downloads.sort(key=lambda x: x['progress'], reverse=True)
        # Sort completed downloads by completion_on (descending)
        completed_downloads.sort(key=lambda x: x['completion_on'] if x['completion_on'] else 0, reverse=True)

        return jsonify({
            "active": active_downloads,
            "completed": completed_downloads
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        current_app.logger.error(f"Failed to fetch qBittorrent downloads for user {user_id}: {e}")
        return jsonify({"error": "Failed to fetch qBittorrent downloads."}), 500

@download_client_bp.route("/downloads/qbittorrent/add", methods=["POST"])
def add_qbittorrent_download():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json()
    urls = data.get('urls') # Magnet links
    torrent_file_base64 = data.get('torrent_file_base64') # Base64 encoded .torrent file content
    
    if not urls and not torrent_file_base64:
        return jsonify({"error": "Either magnet link(s) or a torrent file is required."}), 400

    payload = {}
    files = None

    if urls:
        payload['urls'] = "\n".join(urls)
    elif torrent_file_base64:
        try:
            torrent_content = base64.b64decode(torrent_file_base64)
            files = {'torrents': ('file.torrent', torrent_content, 'application/x-bittorrent')}
        except Exception as e:
            return jsonify({"error": f"Invalid torrent file content: {e}"}), 400

    try:
        response = _make_qbittorrent_request(user_id, "api/v2/torrents/add", method='POST', data=payload, files=files)
        if "Ok." in response:
            return jsonify({"message": "Download added successfully."})
        else:
            return jsonify({"error": response}), 500
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        current_app.logger.error(f"Failed to add qBittorrent download for user {user_id}: {e}")
        return jsonify({"error": "Failed to add download."}), 500

@download_client_bp.route("/downloads/qbittorrent/toggle_pause_resume", methods=["POST"])
def toggle_pause_resume_qbittorrent_download():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json()
    hashes = data.get('hashes')
    action = data.get('action') # 'pause' or 'resume'

    if not hashes or not isinstance(hashes, list) or not action:
        return jsonify({"error": "Torrent hashes and action (pause/resume) are required."}), 400
    
    endpoint = f"api/v2/torrents/{action}"
    payload = {'hashes': '|'.join(hashes)}

    try:
        response = _make_qbittorrent_request(user_id, endpoint, method='POST', data=payload)
        if "Ok." in response:
            return jsonify({"message": f"Torrents {action}d successfully."})
        else:
            return jsonify({"error": response}), 500
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        current_app.logger.error(f"Failed to {action} qBittorrent downloads for user {user_id}: {e}")
        return jsonify({"error": f"Failed to {action} downloads."}), 500

@download_client_bp.route("/downloads/qbittorrent/delete", methods=["POST"])
def delete_qbittorrent_download():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json()
    hashes = data.get('hashes')
    delete_files = data.get('delete_files', False) # Boolean to delete associated files

    if not hashes or not isinstance(hashes, list):
        return jsonify({"error": "Torrent hashes are required."}), 400
    
    endpoint = "api/v2/torrents/delete"
    payload = {
        'hashes': '|'.join(hashes),
        'deleteFiles': delete_files
    }

    try:
        response = _make_qbittorrent_request(user_id, endpoint, method='POST', data=payload)
        if "Ok." in response:
            return jsonify({"message": "Torrents deleted successfully."})
        else:
            return jsonify({"error": response}), 500
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        current_app.logger.error(f"Failed to delete qBittorrent downloads for user {user_id}: {e}")
        return jsonify({"error": "Failed to delete downloads."}), 500