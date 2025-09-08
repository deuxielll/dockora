from flask import Blueprint, jsonify, request, session
from models import User, UserSetting, Notification
from extensions import db, bcrypt
from decorators import login_required, admin_required
# Removed: from helpers import create_user_home_dirs
import os
import re
from werkzeug.utils import secure_filename

users_bp = Blueprint('users', __name__)

@users_bp.route("/user/password", methods=["POST"])
@login_required
def change_password():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        return jsonify({"error": "Current and new passwords are required"}), 400

    if not user.check_password(current_password):
        return jsonify({"error": "Invalid current password"}), 401

    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()

    return jsonify({"message": "Password updated successfully"})

@users_bp.route("/user/profile", methods=["PUT"])
@login_required
def update_current_user_profile():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    new_email = data.get("email")
    new_first_name = data.get("first_name")
    new_last_name = data.get("last_name")
    
    if "email" in data:
        if new_email and new_email != user.email:
            if User.query.filter_by(email=new_email).first():
                return jsonify({"error": "Email is already in use."}), 409
        user.email = new_email

    if "first_name" in data:
        user.first_name = new_first_name
    
    if "last_name" in data:
        user.last_name = new_last_name

    db.session.commit()
    return jsonify({
        "message": "Profile updated successfully.",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar_url": user.avatar_url
        }
    })

AVATAR_UPLOAD_FOLDER = '/data/avatars'
# Removed: ALARM_SOUND_UPLOAD_FOLDER = '/data/alarm_sounds'
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
# Removed: ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'ogg'}

def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

@users_bp.route("/user/avatar", methods=["POST"])
@login_required
def upload_avatar():
    user_id = session.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
        filename = secure_filename(file.filename)
        extension = filename.rsplit('.', 1)[1].lower()
        new_filename = f"user_{user.id}.{extension}"
        
        for ext in ALLOWED_IMAGE_EXTENSIONS:
            old_file = os.path.join(AVATAR_UPLOAD_FOLDER, f"user_{user.id}.{ext}")
            if os.path.exists(old_file) and old_file != os.path.join(AVATAR_UPLOAD_FOLDER, new_filename):
                os.remove(old_file)

        file.save(os.path.join(AVATAR_UPLOAD_FOLDER, new_filename))
        
        user.avatar_url = f"/avatars/{new_filename}"
        db.session.commit()
        return jsonify({"success": True, "avatar_url": user.avatar_url})
    
    return jsonify({"error": "File type not allowed"}), 400

# Removed: New route for uploading custom alarm sounds

@users_bp.route("/users", methods=["GET"])
@login_required
def list_users():
    current_user_id = session.get('user_id')
    current_user = User.query.get(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    # Any logged-in user can see all other users (admins and regular users)
    # but not themselves, for sharing purposes.
    users = User.query.filter(User.id != current_user_id).all()
        
    result = [{
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name
    } for user in users]
    return jsonify(result)

@users_bp.route("/users", methods=["POST"])
@admin_required
def create_user():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "user")
    first_name = data.get("first_name")
    last_name = data.get("last_name")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    if not re.match(r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)", email):
        return jsonify({"error": "Invalid email format."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409

    if role not in ['admin', 'user']:
        return jsonify({"error": "Invalid role specified"}), 400

    # Generate unique username from email
    username_base = email.split('@')[0].lower()
    username_base = re.sub(r'[^a-z0-9_.]', '', username_base)
    username = username_base
    counter = 1
    while User.query.filter_by(username=username).first():
        username = f"{username_base}{counter}"
        counter += 1

    new_user = User(username=username, password=password, role=role)
    new_user.email = email
    new_user.first_name = first_name
    new_user.last_name = last_name
    db.session.add(new_user)
    db.session.commit()
    
    # Removed: create_user_home_dirs(new_user.username)
    
    return jsonify({"id": new_user.id, "username": new_user.username, "role": new_user.role, "email": new_user.email, "first_name": new_user.first_name, "last_name": new_user.last_name}), 201

@users_bp.route("/users/<int:user_id>", methods=["PUT"])
@admin_required
def update_user(user_id):
    user_to_update = User.query.get(user_id)
    if not user_to_update:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    new_role = data.get("role")
    new_first_name = data.get("first_name")
    new_last_name = data.get("last_name")

    if new_role:
        if new_role not in ['admin', 'user']:
            return jsonify({"error": "Invalid role specified"}), 400
        if user_to_update.role == 'admin' and new_role == 'user':
            admin_count = User.query.filter_by(role='admin').count()
            if admin_count <= 1:
                return jsonify({"error": "Cannot remove the last admin."}), 400
        user_to_update.role = new_role
    
    if "first_name" in data:
        user_to_update.first_name = new_first_name
    
    if "last_name" in data:
        user_to_update.last_name = new_last_name
    
    db.session.commit()
    return jsonify({"message": "User updated successfully."})

@users_bp.route("/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    current_user_id = session.get('user_id')
    if user_id == current_user_id:
        return jsonify({"error": "You cannot delete yourself."}), 400
    
    if user_id == 1:
        return jsonify({"error": "The primary admin user cannot be deleted."}), 403

    user_to_delete = User.query.get(user_id)
    if not user_to_delete:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user_to_delete)
    db.session.commit()

    return jsonify({"message": "User deleted successfully."})

@users_bp.route("/settings", methods=["GET"])
@login_required
def get_user_settings():
    user_id = session.get('user_id')
    settings = UserSetting.query.filter_by(user_id=user_id).all()
    settings_dict = {s.key: s.value for s in settings}
    return jsonify(settings_dict)

@users_bp.route("/settings", methods=["POST"])
@login_required
def set_user_setting():
    user_id = session.get('user_id')
    data = request.get_json()
    key = data.get('key')
    value = data.get('value')

    if not key:
        return jsonify({"error": "Setting key is required"}), 400

    setting = UserSetting.query.filter_by(user_id=user_id, key=key).first()
    if setting:
        setting.value = value
    else:
        setting = UserSetting(user_id=user_id, key=key, value=value)
        db.session.add(setting)
    
    db.session.commit()
    return jsonify({"success": True, "message": f"Setting '{key}' saved."})

@users_bp.route("/notifications", methods=["GET"])
@login_required
def get_notifications():
    user_id = session.get('user_id')
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(50).all()
    result = [{
        "id": n.id,
        "message": n.message,
        "type": n.type,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat()
    } for n in notifications]
    return jsonify(result)

@users_bp.route("/notifications/mark-read", methods=["POST"])
@login_required
def mark_notifications_read():
    user_id = session.get('user_id')
    data = request.get_json()
    ids = data.get('ids')

    query = Notification.query.filter_by(user_id=user_id, is_read=False)
    
    if isinstance(ids, list):
        query = query.filter(Notification.id.in_(ids))
    
    query.update({"is_read": True})
    db.session.commit()
    
    return jsonify({"success": True})

@users_bp.route("/notifications/clear-all", methods=["POST"])
@login_required
def clear_all_notifications():
    user_id = session.get('user_id')
    try:
        Notification.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        return jsonify({"success": True, "message": "All notifications cleared."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500