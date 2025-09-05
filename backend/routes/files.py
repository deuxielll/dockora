from flask import Blueprint, jsonify, request, send_from_directory, render_template, send_file, session
import os
import stat
import shutil
import json
import uuid
import io
import zipfile
from datetime import datetime
from werkzeug.utils import secure_filename
from decorators import login_required
from helpers import get_user_and_base_path, resolve_user_path, cleanup_trash
from models import ShareLink, User, SharedItem
from extensions import db

files_bp = Blueprint('files', __name__)

AVATAR_FOLDER = '/data/avatars'

@files_bp.route("/avatars/<path:filename>")
def serve_avatar(filename):
    return send_from_directory(AVATAR_FOLDER, filename)

@files_bp.route("/api/files/browse", methods=["GET"])
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
        for item_name in sorted(os.listdir(real_path), key=str.lower):
            full_item_path = os.path.join(real_path, item_name)
            try:
                stat_info = os.stat(full_item_path)
                item_type = 'dir' if stat.S_ISDIR(stat_info.st_mode) else 'file'
                relative_path = '/' + os.path.relpath(full_item_path, base_path).replace('\\', '/')
                if relative_path == '/.': relative_path = '/'
                items.append({
                    "name": item_name, "path": relative_path, "type": item_type,
                    "size": stat_info.st_size, "modified_at": datetime.fromtimestamp(stat_info.st_mtime).isoformat()
                })
            except (IOError, OSError): continue
        return jsonify(items)
    except Exception as e: return jsonify({"error": str(e)}), 500

@files_bp.route("/api/files/content", methods=["GET"])
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

@files_bp.route("/api/files/create", methods=["POST"])
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

@files_bp.route("/api/files/upload", methods=["POST"])
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

@files_bp.route("/api/files/delete", methods=["POST"])
@login_required
def delete_item():
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    user_paths = request.json.get('paths')
    if not user_paths or not isinstance(user_paths, list): return jsonify({"error": "A list of paths is required"}), 400
    user_trash_path = os.path.join('/data/.trash', str(user.id))
    os.makedirs(user_trash_path, exist_ok=True)
    errors = []
    for user_path in user_paths:
        real_path = resolve_user_path(base_path, is_sandboxed, user_path)
        if not real_path or not os.path.exists(real_path):
            errors.append(f"Path not found: {user_path}")
            continue
        try:
            trashed_name = str(uuid.uuid4())
            trash_info = {"original_path": user_path, "original_name": os.path.basename(real_path), "deleted_at": datetime.utcnow().isoformat()}
            with open(os.path.join(user_trash_path, f"{trashed_name}.trashinfo"), 'w') as f: json.dump(trash_info, f)
            shutil.move(real_path, os.path.join(user_trash_path, trashed_name))
        except Exception as e: errors.append(f"Could not trash {user_path}: {e}")
    if errors: return jsonify({"error": "\n".join(errors)}), 500
    return jsonify({"success": True})

@files_bp.route("/api/files/rename", methods=["POST"])
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

@files_bp.route("/api/files/move", methods=["POST"])
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

@files_bp.route("/api/files/view", methods=["GET"])
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

@files_bp.route("/shares/<token>")
def public_share_page(token):
    if not ShareLink.query.filter_by(token=token).first(): return "Share link not found or expired.", 404
    return render_template('share_page.html')

def get_sharing_user_context(share):
    user = User.query.get_or_404(share.created_by_user_id)
    if user.role == 'admin':
        base_path = '/'
        is_sandboxed = False
    else:
        base_path = os.path.join('/data/home', user.username)
        is_sandboxed = True
    return user, base_path, is_sandboxed

def validate_shared_path(share, requested_relative_path, base_path, is_sandboxed):
    for item in share.items:
        if item.path == requested_relative_path:
            return resolve_user_path(base_path, is_sandboxed, requested_relative_path)
        
        shared_item_real_path = resolve_user_path(base_path, is_sandboxed, item.path)
        if shared_item_real_path and os.path.isdir(shared_item_real_path):
            requested_real_path = resolve_user_path(base_path, is_sandboxed, requested_relative_path)
            if requested_real_path and requested_real_path.startswith(shared_item_real_path + os.sep):
                return requested_real_path
    return None

@files_bp.route("/api/shares/<token>/details")
def get_public_share_details(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    _, base_path, is_sandboxed = get_sharing_user_context(share)
    contents = []
    for item in share.items:
        real_path = resolve_user_path(base_path, is_sandboxed, item.path)
        if not real_path or not os.path.exists(real_path): continue
        stat_info = os.stat(real_path)
        contents.append({
            "name": os.path.basename(real_path), "path": item.path,
            "type": 'dir' if os.path.isdir(real_path) else 'file', "size": stat_info.st_size
        })
    return jsonify({"name": share.name, "type": "dir", "contents": contents})

@files_bp.route("/api/files/share", methods=["POST"])
@login_required
def create_share():
    data = request.json
    paths, name = data.get('paths'), data.get('name')
    if not paths or not isinstance(paths, list) or not name:
        return jsonify({"error": "A list of paths and a name are required"}), 400
    new_share = ShareLink(name=name, created_by_user_id=session['user_id'])
    db.session.add(new_share)
    for path in paths:
        db.session.add(SharedItem(share_link=new_share, path=path))
    db.session.commit()
    return jsonify({"token": new_share.token}), 201

@files_bp.route("/api/files/unshare", methods=["POST"])
@login_required
def delete_share():
    token = request.json.get('token')
    if not token: return jsonify({"error": "Token is required"}), 400
    share = ShareLink.query.filter_by(token=token, created_by_user_id=session['user_id']).first()
    if share:
        db.session.delete(share)
        db.session.commit()
    return jsonify({"success": True})

@files_bp.route("/api/shares/<token>/download")
def download_shared_file(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    _, base_path, is_sandboxed = get_sharing_user_context(share)
    requested_file_path = request.args.get('file')
    if not requested_file_path:
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for item in share.items:
                real_path = resolve_user_path(base_path, is_sandboxed, item.path)
                if not real_path or not os.path.exists(real_path): continue
                if os.path.isdir(real_path):
                    for root, _, files in os.walk(real_path):
                        for file in files:
                            file_real_path = os.path.join(root, file)
                            archive_path = os.path.join(os.path.basename(real_path), os.path.relpath(file_real_path, real_path))
                            zf.write(file_real_path, archive_path)
                else: zf.write(real_path, os.path.basename(real_path))
        memory_file.seek(0)
        return send_file(memory_file, download_name=f'{share.name}.zip', as_attachment=True)
    target_real_path = validate_shared_path(share, requested_file_path, base_path, is_sandboxed)
    if not target_real_path or not os.path.isfile(target_real_path): return "File not found or access denied.", 404
    return send_from_directory(os.path.dirname(target_real_path), os.path.basename(target_real_path), as_attachment=True)

@files_bp.route("/api/shares/<token>/download/selected", methods=["POST"])
def download_selected_shared_files(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    _, base_path, is_sandboxed = get_sharing_user_context(share)
    selected_paths = request.json.get('items', [])
    if not selected_paths: return "No items selected.", 400
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for item_path in selected_paths:
            real_path = validate_shared_path(share, item_path, base_path, is_sandboxed)
            if not real_path or not os.path.exists(real_path): continue
            if os.path.isdir(real_path):
                for root, _, files in os.walk(real_path):
                    for file in files:
                        file_real_path = os.path.join(root, file)
                        archive_path = os.path.join(os.path.basename(real_path), os.path.relpath(file_real_path, real_path))
                        zf.write(file_real_path, archive_path)
            else: zf.write(real_path, os.path.basename(real_path))
    memory_file.seek(0)
    return send_file(memory_file, download_name=f"{share.name}_selection.zip", as_attachment=True)

@files_bp.route("/api/shares/<token>/view")
def view_shared_file(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    _, base_path, is_sandboxed = get_sharing_user_context(share)
    requested_file_path = request.args.get('file')
    if not requested_file_path: return "File path is required.", 400
    target_real_path = validate_shared_path(share, requested_file_path, base_path, is_sandboxed)
    if not target_real_path or not os.path.isfile(target_real_path): return "File not found or access denied.", 404
    return send_from_directory(os.path.dirname(target_real_path), os.path.basename(target_real_path))

@files_bp.route("/api/shares/<token>/content")
def get_shared_file_content(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    _, base_path, is_sandboxed = get_sharing_user_context(share)
    requested_file_path = request.args.get('file')
    if not requested_file_path: return jsonify({"error": "File path is required."}), 400
    target_real_path = validate_shared_path(share, requested_file_path, base_path, is_sandboxed)
    if not target_real_path or not os.path.isfile(target_real_path): return jsonify({"error": "File not found or access denied."}), 404
    try:
        if os.path.getsize(target_real_path) > 5 * 1024 * 1024: return jsonify({"error": "File is too large to display."}), 400
        with open(target_real_path, 'r', errors='ignore') as f: return jsonify({"content": f.read()})
    except Exception as e: return jsonify({"error": str(e)}), 500

@files_bp.route("/api/files/trash", methods=["GET"])
@login_required
def get_trash_items():
    user, _, _ = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    cleanup_trash(user)
    user_trash_path = os.path.join('/data/.trash', str(user.id))
    if not os.path.exists(user_trash_path): return jsonify([])
    items = []
    for item_name in sorted(os.listdir(user_trash_path)):
        if item_name.endswith('.trashinfo'):
            info_file_path = os.path.join(user_trash_path, item_name)
            trashed_item_name = item_name.replace('.trashinfo', '')
            trashed_item_path = os.path.join(user_trash_path, trashed_item_name)
            if not os.path.exists(trashed_item_path): continue
            try:
                with open(info_file_path, 'r') as f: info = json.load(f)
                stat_info = os.stat(trashed_item_path)
                items.append({
                    "name": info.get('original_name', 'Unknown'), "trashed_name": trashed_item_name,
                    "original_path": info.get('original_path', 'Unknown'), "deleted_at": info.get('deleted_at', 'Unknown'),
                    "type": 'dir' if stat.S_ISDIR(stat_info.st_mode) else 'file', "size": stat_info.st_size,
                })
            except (json.JSONDecodeError, KeyError, OSError): continue
    return jsonify(items)

@files_bp.route("/api/files/trash/restore", methods=["POST"])
@login_required
def restore_trash_items():
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    trashed_names = request.json.get('trashed_names')
    if not trashed_names or not isinstance(trashed_names, list): return jsonify({"error": "List of trashed names required"}), 400
    user_trash_path = os.path.join('/data/.trash', str(user.id))
    errors = []
    for trashed_name in trashed_names:
        info_file_path = os.path.join(user_trash_path, f"{trashed_name}.trashinfo")
        trashed_item_path = os.path.join(user_trash_path, trashed_name)
        if not os.path.exists(info_file_path) or not os.path.exists(trashed_item_path):
            errors.append(f"Trashed item not found: {trashed_name}")
            continue
        try:
            with open(info_file_path, 'r') as f: info = json.load(f)
            restore_real_path = resolve_user_path(base_path, is_sandboxed, info['original_path'])
            if not restore_real_path:
                errors.append(f"Invalid restore path for {info.get('original_name')}")
                continue
            if os.path.exists(restore_real_path):
                errors.append(f"Item already exists at original location for {info.get('original_name')}")
                continue
            os.makedirs(os.path.dirname(restore_real_path), exist_ok=True)
            shutil.move(trashed_item_path, restore_real_path)
            os.remove(info_file_path)
        except Exception as e: errors.append(f"Could not restore {info.get('original_name', trashed_name)}: {e}")
    if errors: return jsonify({"error": "\n".join(errors)}), 500
    return jsonify({"success": True})

@files_bp.route("/api/files/trash/delete_permanently", methods=["POST"])
@login_required
def delete_trash_items_permanently():
    user, _, _ = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    trashed_names = request.json.get('trashed_names')
    if not trashed_names or not isinstance(trashed_names, list): return jsonify({"error": "List of trashed names required"}), 400
    user_trash_path = os.path.join('/data/.trash', str(user.id))
    errors = []
    for trashed_name in trashed_names:
        info_file_path = os.path.join(user_trash_path, f"{trashed_name}.trashinfo")
        trashed_item_path = os.path.join(user_trash_path, trashed_name)
        try:
            if os.path.exists(trashed_item_path):
                if os.path.isdir(trashed_item_path): shutil.rmtree(trashed_item_path)
                else: os.remove(trashed_item_path)
            if os.path.exists(info_file_path): os.remove(info_file_path)
        except Exception as e: errors.append(f"Could not delete {trashed_name}: {e}")
    if errors: return jsonify({"error": "\n".join(errors)}), 500
    return jsonify({"success": True})

@files_bp.route("/api/files/trash/empty", methods=["POST"])
@login_required
def empty_trash():
    user, _, _ = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    user_trash_path = os.path.join('/data/.trash', str(user.id))
    if os.path.exists(user_trash_path):
        try:
            shutil.rmtree(user_trash_path)
            os.makedirs(user_trash_path)
        except Exception as e: return jsonify({"error": str(e)}), 500
    return jsonify({"success": True})