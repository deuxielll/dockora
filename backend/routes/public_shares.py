from flask import Blueprint, jsonify, request, send_from_directory, render_template, send_file, session
import os
import io
import zipfile
import json
import uuid
from decorators import login_required
from models import ShareLink, SharedItem, User
from extensions import db
from helpers.share_helpers import validate_shared_path
from helpers.main_helpers import resolve_user_path # Import resolve_user_path

public_shares_bp = Blueprint('public_shares', __name__)

@public_shares_bp.route("/shares/<token>")
def public_share_page(token):
    if not ShareLink.query.filter_by(token=token).first(): return "Share link not found or expired.", 404
    return render_template('share_page.html')

@public_shares_bp.route("/api/shares/<token>/details")
def get_public_share_details(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    
    contents = []
    for item in share.items:
        # Public shares never allow system root access, always sandbox to sharer's home
        real_path = resolve_user_path(share.created_by_user_id, item.path, allow_system_root_access=False)
        if not real_path or not os.path.exists(real_path): continue
        stat_info = os.stat(real_path)
        contents.append({
            "name": os.path.basename(real_path), "path": item.path,
            "type": 'dir' if os.path.isdir(real_path) else 'file', "size": stat_info.st_size
        })
    return jsonify({"name": share.name, "type": "dir", "contents": contents})

@public_shares_bp.route("/api/files/share", methods=["POST"])
@login_required
def create_share():
    data = request.json
    paths, name = data.get('paths'), data.get('name')
    requesting_system_root = data.get('system_root_access', False) # From JSON body

    if not paths or not isinstance(paths, list) or not name:
        return jsonify({"error": "A list of paths and a name are required"}), 400
    
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user: return jsonify({"error": "User not found"}), 404

    new_share = ShareLink(name=name, created_by_user_id=user_id)
    db.session.add(new_share)
    
    errors = []
    for path in paths:
        # Validate each path before adding to share
        real_path = resolve_user_path(user_id, path, allow_system_root_access=requesting_system_root)
        if not real_path or not os.path.exists(real_path):
            errors.append(f"Item not found or inaccessible: {path}")
            continue
        db.session.add(SharedItem(share_link=new_share, path=path))
    
    if errors:
        db.session.rollback()
        return jsonify({"error": "\n".join(errors)}), 400

    db.session.commit()
    return jsonify({"token": new_share.token}), 201

@public_shares_bp.route("/api/files/unshare", methods=["POST"])
@login_required
def delete_share():
    token = request.json.get('token')
    if not token: return jsonify({"error": "Token is required"}), 400
    share = ShareLink.query.filter_by(token=token, created_by_user_id=session['user_id']).first()
    if share:
        db.session.delete(share)
        db.session.commit()
    return jsonify({"success": True})

@public_shares_bp.route("/api/shares/<token>/download")
def download_shared_file(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    sharer_user_id = share.created_by_user_id
    
    requested_file_path = request.args.get('file')
    if not requested_file_path:
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for item in share.items:
                # Public shares never allow system root access, always sandbox to sharer's home
                real_path = resolve_user_path(sharer_user_id, item.path, allow_system_root_access=False)
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
    
    target_real_path = resolve_user_path(sharer_user_id, requested_file_path, allow_system_root_access=False)
    if not target_real_path or not os.path.isfile(target_real_path): return "File not found or access denied.", 404
    return send_from_directory(os.path.dirname(target_real_path), os.path.basename(target_real_path), as_attachment=True)

@public_shares_bp.route("/api/shares/<token>/download/selected", methods=["POST"])
def download_selected_shared_files(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    sharer_user_id = share.created_by_user_id
    
    selected_paths = request.json.get('items', [])
    if not selected_paths: return "No items selected.", 400
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for item_path in selected_paths:
            real_path = resolve_user_path(sharer_user_id, item_path, allow_system_root_access=False)
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

@public_shares_bp.route("/api/shares/<token>/view")
def view_shared_file(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    sharer_user_id = share.created_by_user_id
    
    requested_file_path = request.args.get('file')
    if not requested_file_path: return "File path is required.", 400
    target_real_path = resolve_user_path(sharer_user_id, requested_file_path, allow_system_root_access=False)
    if not target_real_path or not os.path.isfile(target_real_path): return "File not found or access denied.", 404
    return send_from_directory(os.path.dirname(target_real_path), os.path.basename(target_real_path))

@public_shares_bp.route("/api/shares/<token>/content")
def get_shared_file_content(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    sharer_user_id = share.created_by_user_id
    
    requested_file_path = request.args.get('file')
    if not requested_file_path: return jsonify({"error": "File path is required."}), 400
    target_real_path = resolve_user_path(sharer_user_id, requested_file_path, allow_system_root_access=False)
    if not target_real_path or not os.path.isfile(target_real_path): return jsonify({"error": "File not found or access denied."}), 404
    try:
        if os.path.getsize(target_real_path) > 5 * 1024 * 1024: return jsonify({"error": "File is too large to display."}), 400
        with open(target_real_path, 'r', errors='ignore') as f: return jsonify({"content": f.read()})
    except Exception as e: return jsonify({"error": str(e)}), 500