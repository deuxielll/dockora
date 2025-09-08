from flask import Flask
from flask_cors import CORS
import os
import time
from sqlalchemy.exc import OperationalError
from sqlalchemy import text
import threading

from extensions import db, bcrypt
from models import User, SystemSetting

# Import Blueprints
from routes.auth import auth_bp
from routes.users import users_bp
from routes.containers import containers_bp
# Removed: from routes.files import files_bp
from routes.system import system_bp
from routes.apps import apps_bp, start_app_refresh_scheduler
from routes.ssh import ssh_bp
from routes.download_clients import download_clients_bp # New import
from routes.tasks import tasks_bp


def create_app():
    app = Flask(__name__, template_folder='templates')
    
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a_super_secret_key_for_development')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    CORS(app, supports_credentials=True, origins=[r"http://.*"])

    db.init_app(app)
    
    with app.app_context():
        db.create_all()

    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(users_bp, url_prefix='/api')
    app.register_blueprint(containers_bp, url_prefix='/api')
    # Removed: app.register_blueprint(files_bp)
    app.register_blueprint(system_bp, url_prefix='/api')
    app.register_blueprint(apps_bp, url_prefix='/api')
    app.register_blueprint(ssh_bp, url_prefix='/api')
    app.register_blueprint(download_clients_bp, url_prefix='/api') # New: Register download_clients_bp
    app.register_blueprint(tasks_bp, url_prefix='/api')
    

    return app

app = create_app()

if __name__ == "__main__":
    is_db_connected = False
    retries = 10
    
    print("Waiting for database connection...")
    while retries > 0 and not is_db_connected:
        try:
            with app.app_context():
                db.session.execute(text('SELECT 1'))
                is_db_connected = True
                print("Database connection successful.")
        except OperationalError as e:
            print(f"Database connection failed: {e}")
            retries -= 1
            print(f"Retrying in 5 seconds... ({retries} retries left)")
            time.sleep(5)

    if not is_db_connected:
        print("Could not connect to the database after several retries. Exiting.")
        exit(1)

    with app.app_context():
        # Removed: os.makedirs(os.path.realpath('/data/home'), exist_ok=True)
        # Removed: os.makedirs('/data/.trash', exist_ok=True)
        os.makedirs('/data/avatars', exist_ok=True)
        
        scheduler_thread = threading.Thread(target=start_app_refresh_scheduler, args=(app,), daemon=True)
        scheduler_thread.start()
        
    app.run(host="0.0.0.0", port=5000)