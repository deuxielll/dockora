import os
from models import User
from helpers.main_helpers import resolve_user_path # Import the new resolve_user_path

def get_sharing_user_context(share):
    """
    Determines the user object for the user who created a share.
    """
    user = User.query.get_or_404(share.created_by_user_id)
    return user

def validate_shared_path(share, requested_relative_path):
    """
    Validates if a requested path is part of a given share link,
    including checking for sub-items within shared directories.
    Uses the new resolve_user_path.
    """
    sharer_user = get_sharing_user_context(share)
    if not sharer_user:
        return None

    for item in share.items:
        # Check if the requested path is exactly one of the shared items
        if item.path == requested_relative_path:
            # For public shares, we don't allow system root access, always sandbox to sharer's home
            return resolve_user_path(sharer_user.id, requested_relative_path, allow_system_root_access=False)
        
        # If a shared item is a directory, check if the requested path is a sub-item
        # First, resolve the shared item's real path
        shared_item_real_path = resolve_user_path(sharer_user.id, item.path, allow_system_root_access=False)
        if shared_item_real_path and os.path.isdir(shared_item_real_path):
            # Then, resolve the requested path's real path
            requested_real_path = resolve_user_path(sharer_user.id, requested_relative_path, allow_system_root_access=False)
            if requested_real_path and requested_real_path.startswith(shared_item_real_path + os.sep):
                return requested_real_path
    return None