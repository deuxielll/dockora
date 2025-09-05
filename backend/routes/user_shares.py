from flask import Blueprint, jsonify, request, send_from_directory, send_file, session
import os
import stat
from decorators import login_required
from helpers import resolve_user_path
from models import User, UserFileShare, Notification
from extensions import db

user_shares_bp = Blueprint('user_shares', __name__)

@user_shares_bp.route("/files/share-with-user", methods=["POST"])
@login_required
def share_file_with_users():
    sharer_user_id = session.get('user_id')
    sharer_user = User.query.get(sharer_user_id)
    if not sharer_user:
        return jsonify({"error": "Sharer user not found"}), 404

    data = request.get_json()
    paths = data.get('paths')
    recipient_user_ids = data.get('recipient_user_ids')
    requesting_system_root = data.get('system_root_access', False) # From JSON body

    if not paths or not isinstance(paths, list) or not recipient_user_ids or not isinstance(recipient_user_ids, list):
        return jsonify({"error": "Paths and recipient user IDs are required"}), 400
    
    errors = []
    for path in paths:
        # Validate the path from the sharer's perspective
        real_path = resolve_user_path(sharer_user_id, path, allow_system_root_access=requesting_system_root)
        if not real_path or not os.path.exists(real_path):
            errors.append(f"Item not found or inaccessible: {path}")
            continue

        for recipient_id in recipient_user_ids:
            if recipient_id == sharer_user_id:
                continue # Cannot share with self

            existing_share = UserFileShare.query.filter_by(
                sharer_user_id=sharer_user_id,
                recipient_user_id=recipient_id,
                path=path,
                is_system_root_share=requesting_system_root # Include this in unique constraint check
            ).first()

            if not existing_share:
                new_share = UserFileShare(
                    sharer_user_id=sharer_user_id,
                    recipient_user_id=recipient_id,
                    path=path,
                    is_system_root_share=requesting_system_root # Store the flag
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
        # Allow sharer or recipient to remove the share
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
        # Use the stored is_system_root_share flag to resolve the path correctly
        real_path = resolve_user_path(share.sharer_user_id, share.path, allow_system_root_access=share.is_system_root_share)
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
                "shared_at": share.shared_at.isoformat(),
                "is_system_root_share": share.is_system_root_share # Pass the flag to frontend
            })
        except (IOError, OSError):
            continue # Skip if stat fails

    return jsonify(result)

@user_shares_bp.route("/files/shared-by-me", methods=["GET"])
@login_required
def get_shared_by_me_items():
    current_user_id = session.get('user_id')
    if not current_user_id:
        return jsonify({"error": "Authentication required"}), 401

    shared_items = UserFileShare.query.filter_by(sharer_user_id=current_user_id).all()
    result = []

    for share in shared_items:
        # Use the stored is_system_root_share flag to resolve the path correctly
        real_path = resolve_user_path(share.sharer_user_id, share.path, allow_system_root_access=share.is_system_root_share)
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
                "shared_at": share.shared_at.isoformat(),
                "is_system_root_share": share.is_system_root_share # Pass the flag to frontend
            })
        except (IOError, OSError):
            continue # Skip if stat fails

    return jsonify(result)

@user_shares_bp.route("/files/shared-with-me/view", methods=["GET"])
@login_required
def view_shared_with_me_file():
    share_id = request.args.get('share_id')
    if not share_id:
        return jsonify({"error": "Share ID is required"}), 400

    current_user_id = session.get('user_id')
    share_entry = UserFileShare.query.filter_by(id=share_id, recipient_user_id=current_user_id).first()

    if not share_entry:
        return jsonify({"error": "Shared item not found or access denied"}), 404

    # Use the stored is_system_root_share flag to resolve the path correctly
    real_path = resolve_user_path(share_entry.sharer_user_id, share_entry.path, allow_system_root_access=share_entry.is_system_root_share)
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
    if not share_id:
        return jsonify({"error": "Share ID is required"}), 400

    current_user_id = session.get('user_id')
    share_entry = UserFileShare.query.filter_by(id=share_id, recipient_user_id=current_user_id).first()

    if not share_entry:
        return jsonify({"error": "Shared item not found or access denied"}), 404

    # Use the stored is_system_root_share flag to resolve the path correctly
    real_path = resolve_user_path(share_entry.sharer_user_id, share_entry.path, allow_system_root_access=share_entry.is_system_root_share)
    if not real_path or not os.path.exists(real_path):
        return jsonify({"error": "File not found or inaccessible"}), 404
    
    try:
        return send_file(real_path, as_attachment=True, download_name=os.path.basename(real_path))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@user_shares_bp.route("/files/shared-with-me/content", methods=["GET"])
@login_required
def get_shared_with_me_file_content():
    share_id = request.args.get('share_id')
    if not share_id:
        return jsonify({"error": "Share ID is required"}), 400

    current_user_id = session.get('user_id')
    share_entry = UserFileShare.query.filter_by(id=share_id, recipient_user_id=current_user_id).first()

    if not share_entry:
        return jsonify({"error": "Shared item not found or access denied"}), 404

    # Use the stored is_system_root_share flag to resolve the path correctly
    real_path = resolve_user_path(share_entry.sharer_user_id, share_entry.path, allow_system_root_access=share_entry.is_system_root_share)
    if not real_path or not os.path.isfile(real_path):
        return jsonify({"error": "File not found or inaccessible"}), 404
    
    try:
        if os.path.getsize(real_path) > 5 * 1024 * 1024:
            return jsonify({"error": "File is too large to display."}), 400
        with open(real_path, 'r', errors='ignore') as f:
            return jsonify({"content": f.read()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500