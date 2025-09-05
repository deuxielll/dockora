from flask import Blueprint, send_from_directory
import os

# Import sub-blueprints
from routes.file_operations import file_operations_bp
from routes.trash_operations import trash_operations_bp
from routes.public_shares import public_shares_bp
from routes.user_shares import user_shares_bp
from routes.file_activity import file_activity_bp

files_bp = Blueprint('files', __name__)

AVATAR_FOLDER = '/data/avatars'

@files_bp.route("/avatars/<path:filename>")
def serve_avatar(filename):
    return send_from_directory(AVATAR_FOLDER, filename)

# Register sub-blueprints
files_bp.register_blueprint(file_operations_bp, url_prefix='/api')
files_bp.register_blueprint(trash_operations_bp, url_prefix='/api')
files_bp.register_blueprint(public_shares_bp) # Public shares has its own /shares prefix
files_bp.register_blueprint(user_shares_bp, url_prefix='/api')
files_bp.register_blueprint(file_activity_bp, url_prefix='/api')