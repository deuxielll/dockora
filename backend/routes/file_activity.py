from flask import Blueprint, jsonify, request, session
import os
import stat
from datetime import datetime
from decorators import login_required
from helpers import resolve_user_path, USER_HOMES_BASE_DIR # Removed get_user_and_base_path
from models import UserSetting, UserFileShare, User
from extensions import db

file_activity_bp = Blueprint('file_activity', __name__)

@file_activity_bp.route("/files/recent-activity", methods=["GET"])
@login_required
def get_recent_file_activity():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    recent_items = []
    max_depth = 3 # Limit recursion depth for performance
    
    # Always sandbox recent activity to the user's home directory
    base_path = os.path.join(USER_HOMES_BASE_DIR, user.username)
    
    for root, dirs, files in os.walk(base_path):
        current_depth = root.count(os.sep) - base_path.count(os.sep)
        if current_depth > max_depth:
            del dirs[:] # Don't recurse further

        for name in files:
            if name.startswith('.'): continue # Skip hidden files
            full_path = os.path.join(root, name)
            try:
                stat_info = os.stat(full_path)
                relative_path = '/' + os.path.relpath(full_path, base_path).replace('\\', '/')
                recent_items.append({
                    "name": name,
                    "path": relative_path,
                    "type": "file",
                    "modified_at": datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                })
            except (IOError, OSError):
                continue
        
        for name in dirs:
            if name.startswith('.'): continue # Skip hidden directories
            full_path = os.path.join(root, name)
            try:
                stat_info = os.stat(full_path)
                relative_path = '/' + os.path.relpath(full_path, base_path).replace('\\', '/')
                recent_items.append({
                    "name": name,
                    "path": relative_path,
                    "type": "dir",
                    "modified_at": datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                })
            except (IOError, OSError):
                continue

    # Sort by modified_at descending and take the top 5
    recent_items.sort(key=lambda x: x['modified_at'], reverse=True)
    return jsonify(recent_items[:5])

@file_activity_bp.route("/files/new-shared-count", methods=["GET"])
@login_required
def get_new_shared_files_count():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    last_viewed_setting = UserSetting.query.filter_by(user_id=user_id, key='lastViewedSharedFilesTimestamp').first()
    last_viewed_timestamp = datetime.fromisoformat(last_viewed_setting.value) if last_viewed_setting and last_viewed_setting.value else datetime.min

    new_shares_count = UserFileShare.query.filter(
        UserFileShare.recipient_user_id == user_id,
        UserFileShare.shared_at > last_viewed_timestamp
    ).count()

    return jsonify({"count": new_shares_count})

@file_activity_bp.route("/files/update-last-viewed-shared", methods=["POST"])
@login_required
def update_last_viewed_shared_files_timestamp():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401

    setting = UserSetting.query.filter_by(user_id=user_id, key='lastViewedSharedFilesTimestamp').first()
    if setting:
        setting.value = datetime.utcnow().isoformat()
    else:
        setting = UserSetting(user_id=user_id, key='lastViewedSharedFilesTimestamp', value=datetime.utcnow().isoformat())
        db.session.add(setting)
    
    db.session.commit()
    return jsonify({"success": True})