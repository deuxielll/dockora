import os
import shutil
import json
from datetime import datetime, timedelta
from flask import session
from models import User, UserSetting

USER_HOMES_BASE_DIR = os.path.realpath('/data/home')
TRASH_BASE_DIR = '/data/.trash'

def create_user_home_dirs(username):
    home_path = os.path.join(USER_HOMES_BASE_DIR, username)
    os.makedirs(home_path, exist_ok=True)
    
    default_dirs = ["Videos", "Music", "Documents", "Downloads", "Gallery"]
    for d in default_dirs:
        os.makedirs(os.path.join(home_path, d), exist_ok=True)

def cleanup_trash(user):
    retention_setting = UserSetting.query.filter_by(user_id=user.id, key='trashRetentionPeriod').first()
    if not retention_setting or not retention_setting.value or int(retention_setting.value) == 0:
        return

    retention_days = int(retention_setting.value)
    cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
    
    user_trash_path = os.path.join(TRASH_BASE_DIR, str(user.id))
    if not os.path.exists(user_trash_path):
        return

    for item_name in os.listdir(user_trash_path):
        if item_name.endswith('.trashinfo'):
            info_file_path = os.path.join(user_trash_path, item_name)
            try:
                with open(info_file_path, 'r') as f:
                    info = json.load(f)
                deleted_at = datetime.fromisoformat(info['deleted_at'])
                
                if deleted_at < cutoff_date:
                    trashed_item_name = item_name.replace('.trashinfo', '')
                    trashed_item_path = os.path.join(user_trash_path, trashed_item_name)
                    
                    if os.path.exists(trashed_item_path):
                        if os.path.isdir(trashed_item_path):
                            shutil.rmtree(trashed_item_path)
                        else:
                            os.remove(trashed_item_path)
                    
                    os.remove(info_file_path)
            except (json.JSONDecodeError, KeyError, OSError):
                continue

def resolve_user_path(user_id, user_path, allow_system_root_access=False):
    """
    Resolves a user-provided path to a real file system path,
    applying sandboxing unless system root access is explicitly allowed for an admin.

    :param user_id: The ID of the current user.
    :param user_path: The path provided by the user (e.g., '/', '/Documents', '/etc').
    :param allow_system_root_access: If True, and the user is an admin,
                                     absolute user_paths will be resolved from system root.
    :return: The resolved real path, or None if invalid/inaccessible.
    """
    user = User.query.get(user_id)
    if not user:
        return None

    # If admin and requesting system root access, treat user_path as absolute from system root
    if allow_system_root_access and user.role == 'admin' and user_path.startswith('/'):
        real_path = os.path.realpath(user_path)
        # Ensure it doesn't escape the actual root (e.g., /../)
        if not real_path.startswith(os.path.realpath('/')):
            return None
        return real_path
    
    # For all other cases (regular user, or admin within their home, or relative paths),
    # resolve relative to the user's home directory and apply sandboxing.
    base_path = os.path.join(USER_HOMES_BASE_DIR, user.username)
    is_sandboxed = True # All users are sandboxed to their home for non-system-root access

    safe_user_path = user_path.lstrip('/')
    full_path = os.path.join(base_path, safe_user_path)
    real_path = os.path.realpath(full_path)

    if is_sandboxed:
        # Ensure the resolved path is within the user's base directory
        if not real_path.startswith(os.path.realpath(base_path)):
            return None
    
    return real_path

def resolve_path_for_user(target_user_id, user_path, allow_system_root_access=False):
    """
    Resolves a file system path for a given user, based on their home directory.
    This is used for shared files, where the path is relative to the sharer's home.
    """
    return resolve_user_path(target_user_id, user_path, allow_system_root_access)