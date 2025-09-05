from flask import Blueprint, jsonify, request, send_from_directory, render_template, send_file, session
import os
import stat
import shutil
import json
import uuid
import io
import zipfile
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from decorators import login_required
from helpers import get_user_and_base_path, resolve_user_path, cleanup_trash, resolve_path_for_user
from models import ShareLink, User, SharedItem, UserFileShare, Notification, UserSetting
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

@files_bp.route("/api/files/share-with-user", methods=["POST"])
@login_required
def share_file_with_users():
    sharer_user_id = session.get('user_id')
    if not sharer_user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json()
    paths = data.get('paths')
    recipient_user_ids = data.get('recipient_user_ids')

    if not paths or not isinstance(paths, list) or not recipient_user_ids or not isinstance(recipient_user_ids, list):
        return jsonify({"error": "Paths and recipient user IDs are required"}), 400
    
    sharer_user, sharer_base_path, sharer_is_sandboxed = get_user_and_base_path()
    if not sharer_user:
        return jsonify({"error": "Sharer user not found"}), 404

    errors = []
    for path in paths:
        real_path = resolve_user_path(sharer_base_path, sharer_is_sandboxed, path)
        if not real_path or not os.path.exists(real_path):
            errors.append(f"Item not found or inaccessible: {path}")
            continue

        for recipient_id in recipient_user_ids:
            if recipient_id == sharer_user_id:
                continue # Cannot share with self

            existing_share = UserFileShare.query.filter_by(
                sharer_user_id=sharer_user_id,
                recipient_user_id=recipient_id,
                path=path
            ).first()

            if not existing_share:
                new_share = UserFileShare(
                    sharer_user_id=sharer_user_id,
                    recipient_user_id=recipient_id,
                    path=path
                )
                db.session.add(new_share)

                # Create a notification for the recipient
                recipient_user = User.query.get(recipient_id)
                if recipient_user:
                    notification_message = f"'{os.path.basename(path)}' was shared with you by {sharer_user.username}."
                    new_notification = Notification(
                        user_id=recipient_id,
                        message=notification_message,
                        type='info'
                    )
                    db.session.add(new_notification)
    
    if errors:
        db.session.rollback()
        return jsonify({"error": "\n".join(errors)}), 400
    
    db.session.commit()
    return jsonify({"message": "Files shared successfully."}), 201

@files_bp.route("/api/files/unshare-with-user", methods=["POST"])
@login_required
def unshare_file_with_users():
    current_user_id = session.get('user_id')
    if not current_user_id:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json()
    share_ids = data.get('share_ids')

    if not share_ids or not isinstance(share_ids, list):
        return jsonify({"error": "Share IDs are required"}), 400

    try:
        deleted_count = UserFileShare.query.filter(
            UserFileShare.id.in_(share_ids),
            (UserFileShare.sharer_user_id == current_user_id) | (UserFileShare.recipient_user_id == current_user_id)
        ).delete(synchronize_session=False)
        db.session.commit()

        if deleted_count > 0:
            return jsonify({"message": "Shares removed successfully."}), 200
        else:
            return jsonify({"error": "No matching shares found or you do not have permission to unshare these items."}), 403
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@files_bp.route("/api/files/shared-with-me", methods=["GET"])
@login_required
def get_shared_with_me_items():
    current_user_id = session.get('user_id')
    if not current_user_id:
        return jsonify({"error": "Authentication required"}), 401

    shared_items = UserFileShare.query.filter_by(recipient_user_id=current_user_id).all()
    result = []

    for share in shared_items:
        real_path = resolve_path_for_user(share.sharer_user_id, share.path)
        if not real_path or not os.path.exists(real_path):
            # If the original file no longer exists or is inaccessible, skip it
            continue
        
        try:
            stat_info = os.stat(real_path)
            item_type = 'dir' if stat.S_ISDIR(stat_info.st_mode) else 'file'
            
            # Get sharer's username for display
            sharer = User.query.get(share.sharer_user_id)
            sharer_name = sharer.username if sharer else "Unknown"

            result.append({
                "id": share.id, # The ID of the UserFileShare entry
                "name": os.path.basename(real_path),
                "path": share.path, # The original path relative to sharer
                "type": item_type,
                "size": stat_info.st_size,
                "modified_at": datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                "sharer_id": share.sharer_user_id,
                "sharer_name": sharer_name,
                "shared_at": share.shared_at.isoformat()
            })
        except (IOError, OSError):
            continue # Skip if stat fails

    return jsonify(result)

@files_bp.route("/api/files/shared-by-me", methods=["GET"])
@login_required
def get_shared_by_me_items():
    current_user_id = session.get('user_id')
    if not current_user_id:
        return jsonify({"error": "Authentication required"}), 401

    shared_items = UserFileShare.query.filter_by(sharer_user_id=current_user_id).all()
    result = []

    for share in shared_items:
        real_path = resolve_path_for_user(share.sharer_user_id, share.path)
        if not real_path or not os.path.exists(real_path):
            # If the original file no longer exists or is inaccessible, skip it
            continue
        
        try:
            stat_info = os.stat(real_path)
            item_type = 'dir' if stat.S_ISDIR(stat_info.st_mode) else 'file'
            
            # Get recipient's username for display
            recipient = User.query.get(share.recipient_user_id)
            recipient_name = recipient.username if recipient else "Unknown"

            result.append({
                "id": share.id, # The ID of the UserFileShare entry
                "name": os.path.basename(real_path),
                "path": share.path, # The original path relative to sharer
                "type": item_type,
                "size": stat_info.st_size,
                "modified_at": datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                "recipient_id": share.recipient_user_id,
                "recipient_name": recipient_name,
                "shared_at": share.shared_at.isoformat()
            })
        except (IOError, OSError):
            continue # Skip if stat fails

    return jsonify(result)

@files_bp.route("/api/files/shared-with-me/view", methods=["GET"])
@login_required
def view_shared_with_me_file():
    share_id = request.args.get('share_id')
    if not share_id:
        return jsonify({"error": "Share ID is required"}), 400

    current_user_id = session.get('user_id')
    share_entry = UserFileShare.query.filter_by(id=share_id, recipient_user_id=current_user_id).first()

    if not share_entry:
        return jsonify({"error": "Shared item not found or access denied"}), 404

    real_path = resolve_path_for_user(share_entry.sharer_user_id, share_entry.path)
    if not real_path or not os.path.isfile(real_path):
        return jsonify({"error": "File not found or inaccessible"}), 404
    
    try:
        return send_from_directory(os.path.dirname(real_path), os.path.basename(real_path))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@files_bp.route("/api/files/shared-with-me/download", methods=["GET"])
@login_required
def download_shared_with_me_file():
    share_id = request.args.get('share_id')
    if not share_id:
        return jsonify({"error": "Share ID is required"}), 400

    current_user_id = session.get('user_id')
    share_entry = UserFileShare.query.filter_by(id=share_id, recipient_user_id=current_user_id).first()

    if not share_entry:
        return jsonify({"error": "Shared item not found or access denied"}), 404

    real_path = resolve_path_for_user(share_entry.sharer_user_id, share_entry.path)
    if not real_path or not os.path.exists(real_path):
        return jsonify({"error": "File not found or inaccessible"}), 404
    
    try:
        return send_file(real_path, as_attachment=True, download_name=os.path.basename(real_path))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@files_bp.route("/api/files/shared-with-me/content", methods=["GET"])
@login_required
def get_shared_with_me_file_content():
    share_id = request.args.get('share_id')
    if not share_id:
        return jsonify({"error": "Share ID is required"}), 400

    current_user_id = session.get('user_id')
    share_entry = UserFileShare.query.filter_by(id=share_id, recipient_user_id=current_user_id).first()

    if not share_entry:
        return jsonify({"error": "Shared item not found or access denied"}), 404

    real_path = resolve_path_for_user(share_entry.sharer_user_id, share_entry.path)
    if not real_path or not os.path.isfile(real_path):
        return jsonify({"error": "File not found or inaccessible"}), 404
    
    try:
        if os.path.getsize(real_path) > 5 * 1024 * 1024:
            return jsonify({"error": "File is too large to display."}), 400
        with open(real_path, 'r', errors='ignore') as f:
            return jsonify({"content": f.read()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@files_bp.route("/api/files/recent-activity", methods=["GET"])
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

@files_bp.route("/api/files/new-shared-count", methods=["GET"])
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

@files_bp.route("/api/files/update-last-viewed-shared", methods=["POST"])
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