from flask import Blueprint, jsonify, request, send_from_directory, send_file, session
import os
import stat
from decorators import login_required
from helpers import get_user_and_base_path, resolve_user_path, resolve_path_for_user
from models import User, UserFileShare, Notification
from extensions import db
from datetime import datetime # Import datetime for error logging
import zipfile # New import
import io # New import for in-memory zipping

user_shares_bp = Blueprint('user_shares', __name__)

# Helper to resolve the real path of a shared item, including sub-paths within a shared folder
def _resolve_shared_item_real_path(share_entry, virtual_sub_path=None):
    """
    Resolves the real file system path for a shared item, including navigation into sub-paths
    within a shared directory. Ensures path traversal is prevented.
    
    Args:
        share_entry (UserFileShare): The database entry for the shared item.
        virtual_sub_path (str, optional): The path relative to the shared item's root.
                                          E.g., if share_entry.path is '/home/user/docs',
                                          and virtual_sub_path is '/subfolder/file.txt',
                                          this would resolve to '/home/user/docs/subfolder/file.txt'.
    Returns:
        str: The resolved real path, or None if invalid/inaccessible.
    """
    # First, resolve the real path of the original shared item (file or folder)
    original_shared_real_path = resolve_path_for_user(share_entry.sharer_user_id, share_entry.path)
    
    if not original_shared_real_path or not os.path.exists(original_shared_real_path):
        return None

    if not virtual_sub_path or virtual_sub_path == '/':
        return original_shared_real_path
    
    # If a sub-path is provided, append it to the original shared item's real path
    # and then resolve to prevent path traversal.
    target_real_path = os.path.join(original_shared_real_path, virtual_sub_path.lstrip('/'))
    resolved_target_real_path = os.path.realpath(target_real_path)

    # Ensure the resolved path is still within the original shared item's boundaries
    if not resolved_target_real_path.startswith(os.path.realpath(original_shared_real_path)):
        return None
        
    return resolved_target_real_path

@user_shares_bp.route("/files/share-with-user", methods=["POST"])
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

@user_shares_bp.route("/files/unshare-with-user", methods=["POST"])
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

@user_shares_bp.route("/files/shared-with-me", methods=["GET"])
@login_required
def get_shared_with_me_items():
    current_user_id = session.get('user_id')
    if not current_user_id:
        return jsonify({"error": "Authentication required"}), 401

    shared_items = UserFileShare.query.filter_by(recipient_user_id=current_user_id).all()
    result = []

    for share in shared_items:
        try:
            real_path = _resolve_shared_item_real_path(share) # Use the new helper
            if not real_path or not os.path.exists(real_path):
                continue
            
            stat_info = os.stat(real_path)
            item_type = 'dir' if stat.S_ISDIR(stat_info.st_mode) else 'file'
            
            sharer = User.query.get(share.sharer_user_id)
            sharer_name = sharer.username if sharer else "Unknown"

            display_name = os.path.basename(share.path)
            if not display_name:
                display_name = "Home Directory"

            result.append({
                "id": share.id, # This is the UserFileShare ID
                "name": display_name,
                "path": share.path, # Original path relative to sharer's home
                "type": item_type,
                "size": stat_info.st_size,
                "modified_at": datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                "sharer_id": share.sharer_user_id,
                "sharer_name": sharer_name,
                "shared_at": share.shared_at.isoformat(),
                "virtual_path": "/" # Top-level shared items are at virtual root "/"
            })
        except Exception as e:
            print(f"Error processing shared-with-me item {share.id} (path: {share.path}): {e}")
            continue

    return jsonify(result)

@user_shares_bp.route("/files/shared-with-me/<int:share_id>/browse-folder", methods=["GET"])
@login_required
def browse_shared_with_me_folder(share_id):
    current_user_id = session.get('user_id')
    if not current_user_id:
        return jsonify({"error": "Authentication required"}), 401

    share_entry = UserFileShare.query.filter_by(id=share_id, recipient_user_id=current_user_id).first()
    if not share_entry:
        return jsonify({"error": "Shared item not found or access denied"}), 404

    virtual_sub_path = request.args.get('virtual_sub_path', '/')
    real_target_path = _resolve_shared_item_real_path(share_entry, virtual_sub_path)

    if not real_target_path or not os.path.exists(real_target_path):
        return jsonify({"error": "Path not found or inaccessible within shared item."}), 404
    
    if not os.path.isdir(real_target_path):
        return jsonify({"error": "Cannot browse a file as a directory."}), 400

    items_to_display = []
    for item_name in sorted(os.listdir(real_target_path), key=str.lower):
        full_item_real_path = os.path.join(real_target_path, item_name)
        if not os.path.exists(full_item_real_path):
            continue
        
        item_type = 'dir' if os.path.isdir(full_item_real_path) else 'file'
        item_size = os.path.getsize(full_item_real_path) if item_type == 'file' else 0
        
        # Construct the virtual path for this item relative to the shared item's root
        item_virtual_path = os.path.join(virtual_sub_path, item_name).replace('\\', '/')
        
        items_to_display.append({
            "id": share_id, # Keep the top-level share_id for all items within this shared folder
            "name": item_name,
            "path": share_entry.path, # Original path relative to sharer's home
            "type": item_type,
            "size": item_size,
            "modified_at": datetime.fromtimestamp(os.stat(full_item_real_path).st_mtime).isoformat(),
            "sharer_id": share_entry.sharer_user_id,
            "sharer_name": User.query.get(share_entry.sharer_user_id).username,
            "shared_at": share_entry.shared_at.isoformat(),
            "virtual_path": item_virtual_path # The virtual path within the shared item
        })
        
    items_to_display.sort(key=lambda x: (x['type'] != 'dir', x['name'].lower()))

    return jsonify({
        "share_id": share_id,
        "name": os.path.basename(share_entry.path),
        "current_virtual_path": virtual_sub_path,
        "contents": items_to_display
    })

@user_shares_bp.route("/files/shared-by-me", methods=["GET"])
@login_required
def get_shared_by_me_items():
    current_user_id = session.get('user_id')
    if not current_user_id:
        return jsonify({"error": "Authentication required"}), 401

    shared_items = UserFileShare.query.filter_by(sharer_user_id=current_user_id).all()
    result = []

    for share in shared_items:
        try: # Add try-except around processing each share item
            real_path = resolve_path_for_user(share.sharer_user_id, share.path)
            if not real_path or not os.path.exists(real_path):
                # If the original file no longer exists or is inaccessible, skip it
                continue
            
            stat_info = os.stat(real_path)
            item_type = 'dir' if stat.S_ISDIR(stat_info.st_mode) else 'file'
            
            # Get recipient's username for display
            recipient = User.query.get(share.recipient_user_id)
            recipient_name = recipient.username if recipient else "Unknown"

            # Determine the display name for the shared item
            display_name = os.path.basename(share.path)
            if not display_name: # If path is just '/'
                display_name = "Home Directory" # Or some other appropriate label

            result.append({
                "id": share.id, # The ID of the UserFileShare entry
                "name": display_name, # Use the derived display name
                "path": share.path, # The original path relative to sharer
                "type": item_type,
                "size": stat_info.st_size,
                "modified_at": datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                "recipient_id": share.recipient_user_id,
                "recipient_name": recipient_name,
                "shared_at": share.shared_at.isoformat()
            })
        except Exception as e:
            # Log the error for debugging, but don't let it crash the entire request
            print(f"Error processing shared item {share.id} (path: {share.path}): {e}")
            # Optionally, add a notification or skip this item
            continue

    return jsonify(result)

@user_shares_bp.route("/files/shared-with-me/view", methods=["GET"])
@login_required
def view_shared_with_me_file():
    share_id = request.args.get('share_id')
    virtual_sub_path = request.args.get('virtual_sub_path', '/')

    if not share_id:
        return jsonify({"error": "Share ID is required"}), 400

    current_user_id = session.get('user_id')
    share_entry = UserFileShare.query.filter_by(id=share_id, recipient_user_id=current_user_id).first()

    if not share_entry:
        return jsonify({"error": "Shared item not found or access denied"}), 404

    real_path = _resolve_shared_item_real_path(share_entry, virtual_sub_path)
    if not real_path or not os.path.isfile(real_path):
        return jsonify({"error": "File not found or inaccessible"}), 404
    
    try:
        return send_from_directory(os.path.dirname(real_path), os.path.basename(real_path))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_shares_bp.route("/files/shared-with-me/download", methods=["GET"])
@login_required
def download_shared_with_me_file():
    share_id = request.args.get('share_id')
    virtual_sub_path = request.args.get('virtual_sub_path', '/')

    if not share_id:
        return jsonify({"error": "Share ID is required"}), 400

    current_user_id = session.get('user_id')
    share_entry = UserFileShare.query.filter_by(id=share_id, recipient_user_id=current_user_id).first()

    if not share_entry:
        return jsonify({"error": "Shared item not found or access denied"}), 404

    real_path = _resolve_shared_item_real_path(share_entry, virtual_sub_path)
    if not real_path or not os.path.exists(real_path):
        return jsonify({"error": "File not found or inaccessible"}), 404
    
    try:
        if os.path.isdir(real_path):
            # If it's a directory, zip its contents
            memory_file = io.BytesIO()
            with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
                archive_base_name = os.path.basename(real_path)
                for root, _, files in os.walk(real_path):
                    for file in files:
                        file_real_path = os.path.join(root, file)
                        archive_path = os.path.join(archive_base_name, os.path.relpath(file_real_path, real_path))
                        zf.write(file_real_path, archive_path)
            memory_file.seek(0)
            return send_file(memory_file, download_name=f'{archive_base_name}.zip', as_attachment=True)
        else:
            # If it's a file, send the file directly
            return send_file(real_path, as_attachment=True, download_name=os.path.basename(real_path))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_shares_bp.route("/files/shared-with-me/content", methods=["GET"])
@login_required
def get_shared_with_me_file_content():
    share_id = request.args.get('share_id')
    virtual_sub_path = request.args.get('virtual_sub_path', '/')

    if not share_id:
        return jsonify({"error": "Share ID is required"}), 400

    current_user_id = session.get('user_id')
    share_entry = UserFileShare.query.filter_by(id=share_id, recipient_user_id=current_user_id).first()

    if not share_entry:
        return jsonify({"error": "Shared item not found or access denied"}), 404

    real_path = _resolve_shared_item_real_path(share_entry, virtual_sub_path)
    if not real_path or not os.path.isfile(real_path):
        return jsonify({"error": "File not found or inaccessible"}), 404
    
    # Check if it's a ZIP file
    if real_path.lower().endswith('.zip'):
        try:
            with zipfile.ZipFile(real_path, 'r') as zf:
                zip_contents = []
                for member in zf.infolist():
                    zip_contents.append({
                        "name": member.filename,
                        "size": member.file_size,
                        "is_dir": member.is_dir()
                    })
                return jsonify({"type": "zip_contents", "contents": zip_contents})
        except zipfile.BadZipFile:
            return jsonify({"error": "Bad ZIP file or not a ZIP file."}), 400
        except Exception as e:
            return jsonify({"error": f"Failed to read ZIP file: {str(e)}"}), 500

    # Existing logic for other file types
    try:
        if os.path.getsize(real_path) > 5 * 1024 * 1024:
            return jsonify({"error": "File is too large to display."}), 400
        with open(real_path, 'r', errors='ignore') as f:
            return jsonify({"content": f.read()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500