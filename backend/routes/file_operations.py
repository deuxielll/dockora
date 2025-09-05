from flask import Blueprint, jsonify, request, send_from_directory, session
import os
import stat
import shutil
import json
from datetime import datetime
from werkzeug.utils import secure_filename
from decorators import login_required
from helpers import get_user_and_base_path, resolve_user_path
from models import UserFileShare # Used for checking if a file is shared

file_operations_bp = Blueprint('file_operations', __name__)

@file_operations_bp.route("/files/browse", methods=["GET"])
@login_required
def browse_files():
    user_path = request.args.get('path', '/')
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    real_path = resolve_user_path(base_path, is_sandboxed, user_path)
    if not real_path or not os.path.exists(real_path) or not os.path.isdir(real_path):
        return jsonify({"error": "Invalid or inaccessible path"}), 400
    try:
        items = []
        
        # Fetch all shares created by the current user for quick lookup
        user_shares = UserFileShare.query.filter_by(sharer_user_id=user.id).all()
        shared_paths = {share.path for share in user_shares}

        for item_name in sorted(os.listdir(real_path), key=str.lower):
            full_item_path = os.path.join(real_path, item_name)
            try:
                stat_info = os.stat(full_item_path)
                item_type = 'dir' if stat.S_ISDIR(stat_info.st_mode) else 'file'
                relative_path = '/' + os.path.relpath(full_item_path, base_path).replace('\\', '/')
                if relative_path == '/.': relative_path = '/'

                is_shared = relative_path in shared_paths

                items.append({
                    "name": item_name, "path": relative_path, "type": item_type,
                    "size": stat_info.st_size, "modified_at": datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                    "is_shared": is_shared # Add sharing status
                })
            except (IOError, OSError): continue
        return jsonify(items)
    except Exception as e: return jsonify({"error": str(e)}), 500

@file_operations_bp.route("/files/content", methods=["GET"])
@login_required
def get_file_content():
    user_path = request.args.get('path', '')
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    real_path = resolve_user_path(base_path, is_sandboxed, user_path)
    if not real_path or not os.path.exists(real_path) or not os.path.isfile(real_path):
        return jsonify({"error": "Invalid or inaccessible file path"}), 400
    try:
        if os.path.getsize(real_path) > 5 * 1024 * 1024:
            return jsonify({"error": "File is too large to display (> 5MB)"}), 400
        with open(real_path, 'r', errors='ignore') as f:
            return jsonify({"content": f.read()})
    except Exception as e: return jsonify({"error": str(e)}), 500

@file_operations_bp.route("/files/create", methods=["POST"])
@login_required
def create_item():
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    data = request.get_json()
    user_path, name, item_type = data.get('path'), data.get('name'), data.get('type', 'file')
    if not user_path or not name: return jsonify({"error": "Path and name are required"}), 400
    real_path = resolve_user_path(base_path, is_sandboxed, user_path)
    if not real_path: return jsonify({"error": "Invalid path"}), 400
    full_path = os.path.join(real_path, name)
    if os.path.exists(full_path): return jsonify({"error": "File or directory already exists"}), 409
    try:
        if item_type == 'dir': os.makedirs(full_path)
        else:
            with open(full_path, 'w') as f: f.write('')
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@file_operations_bp.route("/files/upload", methods=["POST"])
@login_required
def upload_file():
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    user_path = request.form.get('path')
    if 'file' not in request.files or not user_path: return jsonify({"error": "File and path are required"}), 400
    real_path = resolve_user_path(base_path, is_sandboxed, user_path)
    if not real_path: return jsonify({"error": "Invalid path"}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    try:
        file.save(os.path.join(real_path, filename))
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@file_operations_bp.route("/files/rename", methods=["POST"])
@login_required
def rename_item():
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    data = request.get_json()
    old_user_path, new_name = data.get('old_path'), data.get('new_name')
    if not old_user_path or not new_name: return jsonify({"error": "Old path and new name are required"}), 400
    old_real_path = resolve_user_path(base_path, is_sandboxed, old_user_path)
    if not old_real_path or not os.path.exists(old_real_path): return jsonify({"error": "Invalid source path"}), 400
    new_path = os.path.join(os.path.dirname(old_real_path), new_name)
    if os.path.exists(new_path): return jsonify({"error": "Destination name already exists"}), 409
    try:
        os.rename(old_real_path, new_path)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@file_operations_bp.route("/files/move", methods=["POST"])
@login_required
def move_items():
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    data = request.get_json()
    source_paths, destination_path = data.get('source_paths'), data.get('destination_path')
    if not source_paths or not destination_path or not isinstance(source_paths, list): return jsonify({"error": "Source and destination paths are required"}), 400
    dest_real_path = resolve_user_path(base_path, is_sandboxed, destination_path)
    if not dest_real_path or not os.path.isdir(dest_real_path): return jsonify({"error": "Invalid destination directory"}), 400
    errors = []
    for source_path in source_paths:
        source_real_path = resolve_user_path(base_path, is_sandboxed, source_path)
        if not source_real_path or not os.path.exists(source_real_path):
            errors.append(f"Source path not found: {source_path}")
            continue
        if os.path.isdir(source_real_path) and dest_real_path.startswith(source_real_path):
            errors.append("Cannot move a directory into itself.")
            continue
        final_dest_path = os.path.join(dest_real_path, os.path.basename(source_real_path))
        if os.path.exists(final_dest_path):
            errors.append(f"An item named '{os.path.basename(source_real_path)}' already exists.")
            continue
        try: shutil.move(source_real_path, final_dest_path)
        except Exception as e: errors.append(f"Could not move {source_path}: {e}")
    if errors: return jsonify({"error": "\n".join(errors)}), 500
    return jsonify({"success": True})

@file_operations_bp.route("/files/view", methods=["GET"])
@login_required
def view_file():
    user_path = request.args.get('path', '')
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    real_path = resolve_user_path(base_path, is_sandboxed, user_path)
    if not real_path or not os.path.isfile(real_path): return jsonify({"error": "File not found"}), 404
    try:
        return send_from_directory(os.path.dirname(real_path), os.path.basename(real_path))
    except Exception as e: return jsonify({"error": str(e)}), 500