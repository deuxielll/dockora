from flask import Blueprint, jsonify, request, send_from_directory, render_template, send_file, session
import os
import io
import zipfile
import json
import uuid
from decorators import login_required
from models import ShareLink, SharedItem
from extensions import db
from helpers.share_helpers import get_sharing_user_context, validate_shared_path
from helpers.main_helpers import resolve_user_path # Import resolve_user_path

public_shares_bp = Blueprint('public_shares', __name__)

@public_shares_bp.route("/shares/<token>")
def public_share_page(token):
    if not ShareLink.query.filter_by(token=token).first(): return "Share link not found or expired.", 404
    return render_template('share_page.html')

@public_shares_bp.route("/api/shares/<token>/details")
def get_public_share_details(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    sharer_user, base_path, is_sandboxed = get_sharing_user_context(share)
    
    all_shared_content = []

    for shared_item_entry in share.items:
        # Resolve the real path of the explicitly shared item (file or directory)
        real_shared_item_path = resolve_user_path(base_path, is_sandboxed, shared_item_entry.path)

        if not real_shared_item_path or not os.path.exists(real_shared_item_path):
            continue # Skip if the shared item no longer exists

        # If it's a directory, traverse its contents
        if os.path.isdir(real_shared_item_path):
            for root, dirs, files in os.walk(real_shared_item_path):
                # Calculate the relative path from the original shared item's path
                # This is crucial for generating correct download/view links
                relative_to_shared_entry = os.path.relpath(root, real_shared_item_path)
                
                # Add directories
                for name in dirs:
                    full_path = os.path.join(root, name)
                    # Construct the path as it would appear relative to the sharer's home
                    # This is the 'path' that the frontend will use for download/view
                    relative_path_for_frontend = os.path.join(shared_item_entry.path, relative_to_shared_entry, name).replace('\\', '/')
                    if relative_path_for_frontend.startswith('./'):
                        relative_path_for_frontend = relative_path_for_frontend[2:]
                    if relative_path_for_frontend.startswith('/'):
                        relative_path_for_frontend = relative_path_for_frontend[1:]

                    all_shared_content.append({
                        "name": name,
                        "path": relative_path_for_frontend,
                        "type": "dir",
                        "size": 0 # Directories don't have a size in this context
                    })

                # Add files
                for name in files:
                    full_path = os.path.join(root, name)
                    stat_info = os.stat(full_path)
                    # Construct the path as it would appear relative to the sharer's home
                    relative_path_for_frontend = os.path.join(shared_item_entry.path, relative_to_shared_entry, name).replace('\\', '/')
                    if relative_path_for_frontend.startswith('./'):
                        relative_path_for_frontend = relative_path_for_frontend[2:]
                    if relative_path_for_frontend.startswith('/'):
                        relative_path_for_frontend = relative_path_for_frontend[1:]

                    all_shared_content.append({
                        "name": name,
                        "path": relative_path_for_frontend,
                        "type": "file",
                        "size": stat_info.st_size
                    })
        else: # It's a file
            stat_info = os.stat(real_shared_item_path)
            # For a single file, its 'path' is just its original shared path
            relative_path_for_frontend = shared_item_entry.path
            if relative_path_for_frontend.startswith('/'):
                relative_path_for_frontend = relative_path_for_frontend[1:]

            all_shared_content.append({
                "name": os.path.basename(real_shared_item_path),
                "path": relative_path_for_frontend,
                "type": "file",
                "size": stat_info.st_size
            })
            
    # Sort the content for consistent display
    all_shared_content.sort(key=lambda x: (x['type'] != 'dir', x['name'].lower()))

    return jsonify({"name": share.name, "type": "dir", "contents": all_shared_content})

@public_shares_bp.route("/api/files/share", methods=["POST"])
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
    _, base_path, is_sandboxed = get_sharing_user_context(share)
    requested_file_path = request.args.get('file')
    if not requested_file_path:
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for item in share.items:
                real_path = validate_shared_path(share, item.path, base_path, is_sandboxed)
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

@public_shares_bp.route("/api/shares/<token>/download/selected", methods=["POST"])
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

@public_shares_bp.route("/api/shares/<token>/view")
def view_shared_file(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    _, base_path, is_sandboxed = get_sharing_user_context(share)
    requested_file_path = request.args.get('file')
    if not requested_file_path: return "File path is required.", 400
    target_real_path = validate_shared_path(share, requested_file_path, base_path, is_sandboxed)
    if not target_real_path or not os.path.isfile(target_real_path): return "File not found or access denied.", 404
    return send_from_directory(os.path.dirname(target_real_path), os.path.basename(target_real_path))

@public_shares_bp.route("/api/shares/<token>/content")
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