from flask import Blueprint, jsonify, request, session
import os
import stat
from datetime import datetime
from decorators import login_required
from helpers import get_user_and_base_path, resolve_user_path
from extensions import db

file_activity_bp = Blueprint('file_activity', __name__)

@file_activity_bp.route("/files/recent-activity", methods=["GET"])
@login_required
def get_recent_file_activity():
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user:
        return jsonify({"error": "User not found"}), 404

    recent_items = []
    max_depth = 3 # Limit recursion depth for performance
    
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