import os
from models import User
from helpers import resolve_user_path
from helpers.main_helpers import USER_HOMES_BASE_DIR

def get_sharing_user_context(share):
    """
    Determines the base path and sandboxing status for the user who created a share.
    For shared files, all users (including admins) are sandboxed to their home directory.
    """
    user = User.query.get_or_404(share.created_by_user_id)
    base_path = os.path.join(USER_HOMES_BASE_DIR, user.username)
    is_sandboxed = True # Always sandbox for shared content
    return user, base_path, is_sandboxed

def validate_shared_path(share, requested_relative_path, base_path, is_sandboxed):
    """
    Validates if a requested path is part of a given share link,
    including checking for sub-items within shared directories.
    """
    for item in share.items:
        # Check if the requested path is exactly one of the shared items
        if item.path == requested_relative_path:
            return resolve_user_path(base_path, is_sandboxed, requested_relative_path)
        
        # If a shared item is a directory, check if the requested path is a sub-item
        shared_item_real_path = resolve_user_path(base_path, is_sandboxed, item.path)
        if shared_item_real_path and os.path.isdir(shared_item_real_path):
            requested_real_path = resolve_user_path(base_path, is_sandboxed, requested_relative_path)
            if requested_real_path and requested_real_path.startswith(shared_item_real_path + os.sep):
                return requested_real_path
    return None