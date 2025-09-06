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

# Helper to map a virtual path (relative to share root) to a real path on disk
def map_virtual_to_real_path(share, sharer_base_path, is_sandboxed, virtual_path):
    """
    Maps a virtual path (e.g., '/MyFolder/file.txt') within a share to its real path on disk.
    Ensures the real path is contained within one of the original shared items.
    """
    virtual_path_parts = virtual_path.strip('/').split('/') if virtual_path.strip('/') else []

    if not virtual_path_parts: # Requesting the virtual root '/'
        return None, None # No single real path for the virtual root

    top_level_virtual_name = virtual_path_parts[0]

    for shared_item_entry in share.items:
        real_shared_item_path = resolve_user_path(sharer_base_path, is_sandboxed, shared_item_entry.path)
        if not real_shared_item_path or not os.path.exists(real_shared_item_path):
            continue

        # Check if the top-level virtual name matches the basename of an original shared item
        if os.path.basename(real_shared_item_path) == top_level_virtual_name:
            # This is the base for our current virtual path
            remaining_virtual_path = '/'.join(virtual_path_parts[1:])
            
            real_target_path = real_shared_item_path
            if remaining_virtual_path:
                real_target_path = os.path.join(real_target_path, remaining_virtual_path)
            
            # Final check to ensure the resolved path is still within the original shared item's real path
            # This prevents path traversal attacks if remaining_virtual_path contains '..'
            resolved_real_target_path = os.path.realpath(real_target_path)
            if resolved_real_target_path.startswith(os.path.realpath(real_shared_item_path)):
                return resolved_real_target_path, shared_item_entry.path # Return real path and original shared item path
    return None, None

@public_shares_bp.route("/shares/<token>")
def public_share_page(token):
    if not ShareLink.query.filter_by(token=token).first(): return "Share link not found or expired.", 404
    return render_template('share_page.html')

@public_shares_bp.route("/api/shares/<token>/details")
def get_public_share_details(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    sharer_user, sharer_base_path, is_sandboxed = get_sharing_user_context(share)
    
    requested_virtual_path = request.args.get('sub_path', '/')
    
    items_to_display = []

    if requested_virtual_path == '/':
        # List the top-level items of the share (the original shared items)
        for shared_item_entry in share.items:
            real_path = resolve_user_path(sharer_base_path, is_sandboxed, shared_item_entry.path)
            if not real_path or not os.path.exists(real_path):
                continue
            
            item_name = os.path.basename(real_path)
            item_type = 'dir' if os.path.isdir(real_path) else 'file'
            item_size = os.path.getsize(real_path) if item_type == 'file' else 0
            
            items_to_display.append({
                "name": item_name,
                "path": f"/{item_name}", # Virtual path for frontend navigation
                "type": item_type,
                "size": item_size
            })
    else:
        # Browse inside a specific virtual path
        real_target_path, _ = map_virtual_to_real_path(share, sharer_base_path, is_sandboxed, requested_virtual_path)

        if not real_target_path or not os.path.exists(real_target_path):
            return jsonify({"error": "Path not found or inaccessible within share."}), 404
        
        if not os.path.isdir(real_target_path):
            return jsonify({"error": "Cannot browse a file as a directory."}), 400

        for item_name in sorted(os.listdir(real_target_path), key=str.lower):
            full_item_real_path = os.path.join(real_target_path, item_name)
            if not os.path.exists(full_item_real_path):
                continue
            
            item_type = 'dir' if os.path.isdir(full_item_real_path) else 'file'
            item_size = os.path.getsize(full_item_real_path) if item_type == 'file' else 0
            
            virtual_item_path = os.path.join(requested_virtual_path, item_name).replace('\\', '/')
            
            items_to_display.append({
                "name": item_name,
                "path": virtual_item_path, # Virtual path for frontend navigation
                "type": item_type,
                "size": item_size
            })
            
    items_to_display.sort(key=lambda x: (x['type'] != 'dir', x['name'].lower()))

    return jsonify({
        "name": share.name,
        "current_virtual_path": requested_virtual_path,
        "contents": items_to_display
    })

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
    sharer_user, sharer_base_path, is_sandboxed = get_sharing_user_context(share)
    
    requested_virtual_file_path = request.args.get('file') # This is now a virtual path
    
    if not requested_virtual_file_path:
        # If no specific file is requested, download the current virtual folder as a zip
        # This means the frontend will pass the current_virtual_path as 'file' parameter
        requested_virtual_file_path = request.args.get('current_virtual_path', '/')
        
        real_target_path, _ = map_virtual_to_real_path(share, sharer_base_path, is_sandboxed, requested_virtual_file_path)

        if not real_target_path: # Virtual root or invalid path
            # If at virtual root, zip all top-level shared items
            if requested_virtual_file_path == '/':
                memory_file = io.BytesIO()
                with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
                    for shared_item_entry in share.items:
                        real_path = resolve_user_path(sharer_base_path, is_sandboxed, shared_item_entry.path)
                        if not real_path or not os.path.exists(real_path): continue
                        
                        archive_base_name = os.path.basename(real_path)
                        if os.path.isdir(real_path):
                            for root, _, files in os.walk(real_path):
                                for file in files:
                                    file_real_path = os.path.join(root, file)
                                    archive_path = os.path.join(archive_base_name, os.path.relpath(file_real_path, real_path))
                                    zf.write(file_real_path, archive_path)
                        else:
                            zf.write(real_path, archive_base_name)
                memory_file.seek(0)
                return send_file(memory_file, download_name=f'{share.name}.zip', as_attachment=True)
            else:
                return "Cannot download non-existent path.", 404

        # If a real_target_path is found, zip its contents
        if os.path.isdir(real_target_path):
            memory_file = io.BytesIO()
            with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
                archive_base_name = os.path.basename(real_target_path)
                for root, _, files in os.walk(real_target_path):
                    for file in files:
                        file_real_path = os.path.join(root, file)
                        archive_path = os.path.join(archive_base_name, os.path.relpath(file_real_path, real_target_path))
                        zf.write(file_real_path, archive_path)
            memory_file.seek(0)
            return send_file(memory_file, download_name=f'{archive_base_name}.zip', as_attachment=True)
        else:
            # This case should ideally not be hit if 'file' is a directory, but handle defensively
            return "Cannot download a single file without 'file' parameter.", 400

    # Specific file download
    real_target_path, _ = map_virtual_to_real_path(share, sharer_base_path, is_sandboxed, requested_virtual_file_path)
    if not real_target_path or not os.path.isfile(real_target_path):
        return "File not found or access denied.", 404
    
    return send_from_directory(os.path.dirname(real_target_path), os.path.basename(real_target_path), as_attachment=True)


@public_shares_bp.route("/api/shares/<token>/view")
def view_shared_file(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    sharer_user, sharer_base_path, is_sandboxed = get_sharing_user_context(share)
    requested_virtual_file_path = request.args.get('file') # This is now a virtual path
    
    if not requested_virtual_file_path:
        return "File path is required.", 400

    real_target_path, _ = map_virtual_to_real_path(share, sharer_base_path, is_sandboxed, requested_virtual_file_path)
    if not real_target_path or not os.path.isfile(real_target_path):
        return "File not found or access denied.", 404
    
    return send_from_directory(os.path.dirname(real_target_path), os.path.basename(real_target_path))

@public_shares_bp.route("/api/shares/<token>/content")
def get_shared_file_content(token):
    share = ShareLink.query.filter_by(token=token).first_or_404()
    sharer_user, sharer_base_path, is_sandboxed = get_sharing_user_context(share)
    requested_virtual_file_path = request.args.get('file') # This is now a virtual path
    zip_sub_path = request.args.get('zip_sub_path', '/') # New parameter for path inside ZIP
    
    if not requested_virtual_file_path:
        return jsonify({"error": "File path is required."}), 400

    real_target_path, _ = map_virtual_to_real_path(share, sharer_base_path, is_sandboxed, requested_virtual_file_path)
    if not real_target_path or not os.path.isfile(real_target_path):
        return jsonify({"error": "File not found or access denied."}), 404
    
    # Handle ZIP files
    if real_target_path.lower().endswith('.zip'):
        try:
            with zipfile.ZipFile(real_target_path, 'r') as zf:
                zip_contents = []
                normalized_zip_sub_path = zip_sub_path.strip('/')
                if normalized_zip_sub_path and not normalized_zip_sub_path.endswith('/'):
                    normalized_zip_sub_path += '/'

                for member in zf.infolist():
                    member_name = member.filename
                    if member_name == normalized_zip_sub_path and member.is_dir():
                        continue

                    if normalized_zip_sub_path == '/' or member_name.startswith(normalized_zip_sub_path):
                        relative_to_sub_path = member_name[len(normalized_zip_sub_path):]
                        if '/' not in relative_to_sub_path.strip('/'):
                            if relative_to_sub_path.endswith('/') and not member.is_dir():
                                continue
                            zip_contents.append({
                                "name": relative_to_sub_path.strip('/'),
                                "size": member.file_size,
                                "type": "dir" if member.is_dir() else "file",
                                "path": os.path.join(zip_sub_path, relative_to_sub_path).replace('\\', '/')
                            })
                
                if not zip_sub_path.endswith('/'):
                    try:
                        with zf.open(normalized_zip_sub_path) as member_file:
                            content = member_file.read()
                            try:
                                return jsonify({"type": "file_content", "content": content.decode('utf-8')})
                            except UnicodeDecodeError:
                                return jsonify({"type": "file_content", "content": "Binary file content cannot be displayed directly."})
                    except KeyError:
                        return jsonify({"error": f"File '{zip_sub_path}' not found in archive."}), 404
                
                unique_zip_contents = []
                seen_names = set()
                for item in zip_contents:
                    if item['name'] not in seen_names:
                        unique_zip_contents.append(item)
                        seen_names.add(item['name'])
                
                unique_zip_contents.sort(key=lambda x: (x['type'] != 'dir', x['name'].lower()))

                return jsonify({"type": "zip_contents", "contents": unique_zip_contents, "current_zip_path": zip_sub_path})
        except zipfile.BadZipFile:
            return jsonify({"error": "Bad ZIP file or not a ZIP file."}), 400
        except Exception as e:
            return jsonify({"error": f"Failed to read ZIP file: {str(e)}"}), 500

    # Existing logic for other file types
    try:
        if os.path.getsize(real_target_path) > 5 * 1024 * 1024:
            return jsonify({"error": "File is too large to display."}), 400
        with open(real_target_path, 'r', errors='ignore') as f:
            return jsonify({"type": "file_content", "content": f.read()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500