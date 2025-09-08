import os
import shutil
import json
from datetime import datetime, timedelta
from flask import session
from models import User, UserSetting

# Removed: USER_HOMES_BASE_DIR = os.path.realpath('/data/home')
# Removed: TRASH_BASE_DIR = '/data/.trash'

# Removed: create_user_home_dirs function
# Removed: cleanup_trash function
# Removed: get_user_and_base_path function
# Removed: resolve_user_path function
# Removed: resolve_path_for_user function