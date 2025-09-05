from flask import Blueprint, jsonify, request, send_from_directory, session
import os
import stat
import shutil
import json
from datetime import datetime
from werkzeug.utils import secure_filename
from decorators import login_required
from helpers import resolve_user_path, USER_HOMES_BASE_DIR # Removed get_user_and_base_path

file_operations_bp = Blueprint('file_operations', __name__)

@file_operations_bp.route("/files/browse", methods=["GET"])
@login_required
def browse_files():
    user_path = request.args.get('path', '/')
    requesting_system_root = request.args.get('system_root_access', 'false').lower() == 'true'
    
    user_id = session.get('user_id')
    user = User.query.get(user_id) # Need user object for role check
    if not user: return jsonify({"error": "User not found"}), 404

    real_path = resolve_user_path(user_id, user_path, allow_system_root_access=requesting_system_root)

    if not real_path or not os.path.exists(real_path) or not os.path.isdir(real_path):
        return jsonify({"error": "Invalid or inaccessible path"}), 400
    
    try:
        items = []
        user_shares = UserFileShare.query.filter_by(sharer_user_id=user_id).all()
        shared_paths = {share.path for share in user_shares}

        for item_name in sorted(os.listdir(real_path), key=str.lower):
            if requesting_system_root and user_path == '/' and item_name.startswith('.'):
                continue

            full_item_path = os.path.join(real_path, item_name)
            try:
                stat_info = os.stat(full_item_path)
                item_type = 'dir' if stat.S_ISDIR(stat_info.st_mode) else 'file'
                
                if requesting_system_root and user.role == 'admin':
                    item_frontend_path = os.path.join(user_path, item_name).replace('\\', '/')
                    if not item_frontend_path.startswith('/'):
                        item_frontend_path = '/' + item_frontend_path
                else:
                    # For sandboxed users, paths are relative to their home, prefixed with '/'
                    # Need the base_path for the current user to calculate relpath
                    current_user_base_path = os.path.join(USER_HOMES_BASE_DIR, user.username)
                    item_frontend_path = '/' + os.path.relpath(full_item_path, current_user_base_path).replace('\\', '/')
                    if item_frontend_path == '/.': item_frontend_path = '/'

                is_shared = item_frontend_path in shared_paths

                items.append({
                    "name": item_name, "path": item_frontend_path, "type": item_type,
                    "size": stat_info.st_size, "modified_at": datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                    "is_shared": is_shared
                })
            except (IOError, OSError): continue
        return jsonify(items)
    except Exception as e: return jsonify({"error": str(e)}), 500

@file_operations_bp.route("/files/content", methods=["GET"])
@login_required
def get_file_content():
    user_path = request.args.get('path', '')
    requesting_system_root = request.args.get('system_root_access', 'false').lower() == 'true'
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "User not found"}), 404
    real_path = resolve_user_path(user_id, user_path, allow_system_root_access=requesting_system_root)
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
    requesting_system_root = request.json.get('system_root_access', False) # From JSON body
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "User not found"}), 404
    data = request.get_json()
    user_path, name, item_type = data.get('path'), data.get('name'), data.get('type', 'file')
    if not user_path or not name: return jsonify({"error": "Path and name are required"}), 400
    real_path = resolve_user_path(user_id, user_path, allow_system_root_access=requesting_system_root)
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
    requesting_system_root = request.form.get('system_root_access', 'false').lower() == 'true' # From form data
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "User not found"}), 404
    user_path = request.form.get('path')
    if 'file' not in request.files or not user_path: return jsonify({"error": "File and path are required"}), 400
    real_path = resolve_user_path(user_id, user_path, allow_system_root_access=requesting_system_root)
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
    requesting_system_root = request.json.get('system_root_access', False)
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "User not found"}), 404
    data = request.get_json()
    old_user_path, new_name = data.get('old_path'), data.get('new_name')
    if not old_user_path or not new_name: return jsonify({"error": "Old path and new name are required"}), 400
    old_real_path = resolve_user_path(user_id, old_user_path, allow_system_root_access=requesting_system_root)
    if not old_real_path or not os.path.exists(old_real_path): return jsonify({"error": "Invalid source path"}), 400
    
    # Ensure new_name is safe and doesn't try to escape
    if '..' in new_name or '/' in new_name or '\\' in new_name:
        return jsonify({"error": "New name contains invalid characters."}), 400

    new_path = os.path.join(os.path.dirname(old_real_path), new_name)
    
    # Determine the effective base for the rename operation
    if requesting_system_root and user.role == 'admin':
        effective_base_for_rename = os.path.dirname(old_real_path) # Admin can rename within the current system directory
    else:
        effective_base_for_rename = os.path.join(USER_HOMES_BASE_DIR, user.username) # Sandboxed to home

    # Check if the new_path is within the effective_base_for_rename
    resolved_new_path_check = os.path.realpath(new_path)
    if not resolved_new_path_check.startswith(os.path.realpath(effective_base_for_rename)):
        return jsonify({"error": "Cannot rename to a path outside the current directory."}), 400

    if os.path.exists(new_path): return jsonify({"error": "Destination name already exists"}), 409
    try:
        os.rename(old_real_path, new_path)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@file_operations_bp.route("/files/move", methods=["POST"])
@login_required
def move_items():
    requesting_system_root = request.json.get('system_root_access', False)
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "User not found"}), 404
    data = request.get_json()
    source_paths, destination_path = data.get('source_paths'), data.get('destination_path')
    if not source_paths or not destination_path or not isinstance(source_paths, list): return jsonify({"error": "Source and destination paths are required"}), 400
    
    dest_real_path = resolve_user_path(user_id, destination_path, allow_system_root_access=requesting_system_root)
    if not dest_real_path or not os.path.isdir(dest_real_path): return jsonify({"error": "Invalid destination directory"}), 400
    
    errors = []
    for source_path in source_paths:
        source_real_path = resolve_user_path(user_id, source_path, allow_system_root_access=requesting_system_root)
        if not source_real_path or not os.path.exists(source_real_path):
            errors.append(f"Source path not found: {source_path}")
            continue
        
        # Prevent moving a directory into itself or its subdirectories
        if os.path.isdir(source_real_path) and dest_real_path.startswith(source_real_path):
            errors.append(f"Cannot move '{os.path.basename(source_path)}' into itself or its subdirectory.")
            continue
        
        final_dest_path = os.path.join(dest_real_path, os.path.basename(source_real_path))
        if os.path.exists(final_dest_path):
            errors.append(f"An item named '{os.path.basename(source_real_path)}' already exists in the destination.")
            continue
        try: shutil.move(source_real_path, final_dest_path)
        except Exception as e: errors.append(f"Could not move {source_path}: {e}")
    if errors: return jsonify({"error": "\n".join(errors)}), 500
    return jsonify({"success": True})

@file_operations_bp.route("/files/view", methods=["GET"])
@login_required
def view_file():
    user_path = request.args.get('path', '')
    requesting_system_root = request.args.get('system_root_access', 'false').lower() == 'true'
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "User not found"}), 404
    real_path = resolve_user_path(user_id, user_path, allow_system_root_access=requesting_system_root)
    if not real_path or not os.path.isfile(real_path): return jsonify({"error": "File not found"}), 404
    try:
        return send_from_directory(os.path.dirname(real_path), os.path.basename(real_path))
    except Exception as e: return jsonify({"error": str(e)}), 500