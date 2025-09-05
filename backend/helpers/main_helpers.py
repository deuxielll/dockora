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

def get_user_and_base_path():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return None, None, None

    if user.role == 'admin':
        base_path = '/'
        is_sandboxed = False
    else:
        base_path = os.path.join(USER_HOMES_BASE_DIR, user.username)
        is_sandboxed = True
    
    return user, base_path, is_sandboxed

def resolve_user_path(base_path, is_sandboxed, user_path):
    safe_user_path = user_path.lstrip('/')
    full_path = os.path.join(base_path, safe_user_path)
    real_path = os.path.realpath(full_path)

    if is_sandboxed:
        if not real_path.startswith(os.path.realpath(base_path)):
            return None
    
    return real_path

def resolve_path_for_user(target_user_id, user_path):
    """
    Resolves a file system path for a given user, based on their home directory.
    This is used for shared files, where the path is relative to the sharer's home.
    """
    target_user = User.query.get(target_user_id)
    if not target_user:
        return None

    if target_user.role == 'admin':
        base_path = '/'
        is_sandboxed = False
    else:
        base_path = os.path.join(USER_HOMES_BASE_DIR, target_user.username)
        is_sandboxed = True
    
    return resolve_user_path(base_path, is_sandboxed, user_path)