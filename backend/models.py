from extensions import db, bcrypt
import uuid
from datetime import datetime
import json

app_user_share = db.Table('app_user_share',
    db.Column('application_id', db.Integer, db.ForeignKey('application.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')
    email = db.Column(db.String(120), unique=True, nullable=True)
    first_name = db.Column(db.String(80), nullable=True)
    last_name = db.Column(db.String(80), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    settings = db.relationship('UserSetting', backref='user', lazy=True, cascade="all, delete-orphan")
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade="all, delete-orphan")
    shares = db.relationship('ShareLink', backref='user', lazy=True, cascade="all, delete-orphan")
    alarms = db.relationship('Alarm', backref='user', lazy=True, cascade="all, delete-orphan")
    world_clocks = db.relationship('WorldClock', backref='user', lazy=True, cascade="all, delete-orphan")
    reset_token = db.Column(db.String(100), nullable=True, unique=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)
    # New relationship for files shared *with* this user
    received_file_shares = db.relationship('UserFileShare', foreign_keys='UserFileShare.recipient_user_id', backref='recipient', lazy=True, cascade="all, delete-orphan")
    # New relationship for files shared *by* this user
    sent_file_shares = db.relationship('UserFileShare', foreign_keys='UserFileShare.sharer_user_id', backref='sharer', lazy=True, cascade="all, delete-orphan")
    custom_widgets = db.relationship('CustomWidget', backref='user', lazy=True, cascade="all, delete-orphan")


    def __init__(self, username, password, role='user'):
        self.username = username
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        self.role = role

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class UserSetting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    key = db.Column(db.String(100), nullable=False)
    value = db.Column(db.Text, nullable=True)
    __table_args__ = (db.UniqueConstraint('user_id', 'key', name='_user_key_uc'),)

class Alarm(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    time = db.Column(db.String(5), nullable=False) # e.g., "07:00"
    _days = db.Column('days', db.Text, nullable=False, default='[]') # Stored as JSON string
    enabled = db.Column(db.Boolean, default=True, nullable=False)
    snoozed_until = db.Column(db.DateTime, nullable=True)

    @property
    def days(self):
        return json.loads(self._days)

    @days.setter
    def days(self, value):
        self._days = json.dumps(value)

class WorldClock(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    timezone = db.Column(db.String(100), nullable=False) # e.g., "America/New_York"

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), nullable=False, default='info') # e.g., 'info', 'warning', 'error'
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

class Stack(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    compose_content = db.Column(db.Text, nullable=False)
    env_content = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class ShareLink(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(32), unique=True, nullable=False, default=lambda: uuid.uuid4().hex)
    name = db.Column(db.String(255), nullable=False)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    items = db.relationship('SharedItem', backref='share_link', lazy=True, cascade="all, delete-orphan")

class SharedItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    share_link_id = db.Column(db.Integer, db.ForeignKey('share_link.id'), nullable=False)
    path = db.Column(db.String(1024), nullable=False)

class UserFileShare(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sharer_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    path = db.Column(db.String(1024), nullable=False) # Path relative to sharer's base path
    shared_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    __table_args__ = (db.UniqueConstraint('sharer_user_id', 'recipient_user_id', 'path', name='_user_file_share_uc'),)

class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    container_id = db.Column(db.String(64), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    stack_name = db.Column(db.String(255), nullable=True)
    ports = db.Column(db.JSON, nullable=True)
    shared_with = db.relationship('User', secondary=app_user_share, lazy='subquery',
                                  backref=db.backref('shared_apps', lazy=True))

class ContainerStatus(db.Model):
    id = db.Column(db.String(64), primary_key=True)
    status = db.Column(db.String(50), nullable=False)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SystemSetting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)

class CustomWidget(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    code = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(50), nullable=False, default='html') # html, css, javascript, react, vue, svelte
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())