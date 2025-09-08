from flask import Blueprint, jsonify, request, session, current_app, render_template
from models import User, SystemSetting
from extensions import db, bcrypt
# Removed: from helpers import create_user_home_dirs
import secrets
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from sqlalchemy import or_
import re

auth_bp = Blueprint('auth', __name__)

def send_password_reset_email(email, token):
    settings_list = SystemSetting.query.filter(SystemSetting.key.like('smtp_%')).all()
    settings = {s.key: s.value for s in settings_list}
    
    smtp_server = settings.get('smtp_server')
    smtp_port = settings.get('smtp_port')
    smtp_user = settings.get('smtp_user')
    smtp_password = settings.get('smtp_password')
    smtp_sender = settings.get('smtp_sender_email')
    smtp_use_tls = settings.get('smtp_use_tls', 'true').lower() == 'true'

    if not all([smtp_server, smtp_port, smtp_sender]):
        current_app.logger.error("SMTP settings are not fully configured.")
        return False

    # Construct URL using frontend's host, assuming standard ports
    host = request.host.split(':')[0]
    reset_url = f"http://{host}:3000/reset-password/{token}"
    
    html_body = render_template('password_reset_email.html', reset_url=reset_url)
    msg = MIMEText(html_body, 'html')
    msg['Subject'] = 'Dockora - Password Reset Request'
    msg['From'] = smtp_sender
    msg['To'] = email

    try:
        with smtplib.SMTP(smtp_server, int(smtp_port)) as server:
            if smtp_use_tls:
                server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send password reset email: {e}")
        return False

@auth_bp.route("/setup", methods=["GET"])
def check_setup():
    if User.query.first():
        return jsonify({"setup_complete": True})
    return jsonify({"setup_complete": False})

@auth_bp.route("/setup", methods=["POST"])
def initial_setup():
    if User.query.first():
        return jsonify({"error": "Setup has already been completed."}), 400
    
    data = request.get_json()
    
    # User data
    email = data.get("email")
    password = data.get("password")
    first_name = data.get("first_name")
    last_name = data.get("last_name")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Generate unique username from email
    username_base = email.split('@')[0].lower()
    username_base = re.sub(r'[^a-z0-9_.]', '', username_base)
    username = username_base
    counter = 1
    while User.query.filter_by(username=username).first():
        username = f"{username_base}{counter}"
        counter += 1

    new_user = User(username=username, password=password, role='admin')
    new_user.email = email
    new_user.first_name = first_name
    new_user.last_name = last_name
    db.session.add(new_user)
    
    # SMTP data (optional)
    smtp_settings = data.get("smtp_settings")
    if smtp_settings and isinstance(smtp_settings, dict):
        allowed_keys = ['smtp_server', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_sender_email', 'smtp_use_tls']
        for key, value in smtp_settings.items():
            if key in allowed_keys:
                setting = SystemSetting(key=key, value=str(value))
                db.session.add(setting)

    db.session.commit()
    
    # Removed: create_user_home_dirs(new_user.username)
    
    # Log the new user in automatically
    session['user_id'] = new_user.id
    
    return jsonify({"message": "Admin user created successfully."})

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if user and user.check_password(password):
        session['user_id'] = user.id
        return jsonify({"message": "Login successful"})
    
    return jsonify({"error": "Invalid credentials"}), 401

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.pop('user_id', None)
    return jsonify({"message": "Logout successful"})

@auth_bp.route("/check_auth", methods=["GET"])
def check_auth():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            return jsonify({
                "is_logged_in": True,
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
    return jsonify({"is_logged_in": False, "user": None})

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email")
    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if user:
        token = secrets.token_urlsafe(32)
        expiry = datetime.utcnow() + timedelta(hours=1)
        user.reset_token = token
        user.reset_token_expiry = expiry
        db.session.commit()
        send_password_reset_email(user.email, token)

    return jsonify({"message": "If an account with that email exists, a password reset link has been sent."})

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400

    user = User.query.filter_by(reset_token=token).first()

    if not user or user.reset_token_expiry < datetime.utcnow():
        return jsonify({"error": "Invalid or expired password reset token."}), 400

    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user.reset_token = None
    user.reset_token_expiry = None
    db.session.commit()

    return jsonify({"message": "Password has been reset successfully."})