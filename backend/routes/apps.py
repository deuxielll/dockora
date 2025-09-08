from flask import Blueprint, jsonify, current_app, session, request
from extensions import db, client
from models import Application, User
from decorators import login_required, admin_required
import time
import docker
# Removed: from helpers import cleanup_trash

apps_bp = Blueprint('apps', __name__)

def refresh_apps_from_docker():
    """
    Core logic to synchronize the Application table with Docker containers.
    """
    with current_app.app_context():
        try:
            containers = client.containers.list(all=True)
            core_app_names = ['dockora-frontend', 'dockora-backend', 'dockora-db']
            existing_db_ids = {app.container_id for app in Application.query.all()}
            current_docker_ids = set()

            for c in containers:
                # Use HostConfig.PortBindings to get port mappings even for stopped containers
                ports_attr = c.attrs.get('HostConfig', {}).get('PortBindings', {})
                if not ports_attr or c.name in core_app_names:
                    continue

                current_docker_ids.add(c.short_id)

                port_mappings = []
                for container_port, host_bindings in ports_attr.items():
                    if host_bindings:
                        for binding in host_bindings:
                            host_ip = binding.get('HostIp', '0.0.0.0')
                            host_port = binding.get('HostPort', '')
                            if host_ip in ['', '::']: host_ip = '0.0.0.0'
                            if host_port:
                                port_mappings.append(f"{host_ip}:{host_port}->{container_port}")
                
                if not port_mappings:
                    continue

                display_name = c.name
                if display_name.startswith('dockora-'):
                    display_name = display_name[8:]

                app = Application.query.filter_by(container_id=c.short_id).first()
                if app:
                    app.name = display_name
                    app.status = c.status
                    app.stack_name = c.labels.get('com.docker.compose.project')
                    app.ports = port_mappings
                else:
                    new_app = Application(
                        container_id=c.short_id,
                        name=display_name,
                        status=c.status,
                        stack_name=c.labels.get('com.docker.compose.project'),
                        ports=port_mappings
                    )
                    db.session.add(new_app)
            
            stale_ids = existing_db_ids - current_docker_ids
            if stale_ids:
                Application.query.filter(Application.container_id.in_(stale_ids)).delete(synchronize_session=False)

            db.session.commit()
        except Exception as e:
            print(f"An unexpected error occurred during app refresh: {e}")
            db.session.rollback()

@apps_bp.route("/apps", methods=["GET"])
@login_required
def list_apps():
    user_id = session.get('user_id')
    user = User.query.get(user_id)

    if user.role == 'admin':
        apps = Application.query.all()
    else:
        apps = user.shared_apps

    result = [{
        "id": app.container_id,
        "name": app.name,
        "status": app.status,
        "stack_name": app.stack_name,
        "ports": app.ports,
    } for app in apps]
    return jsonify(result)

@apps_bp.route("/apps/refresh", methods=["POST"])
@login_required
def trigger_refresh():
    try:
        refresh_apps_from_docker()
        return jsonify({"message": "App list refresh triggered successfully."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@apps_bp.route("/apps/<container_id>/shares", methods=["GET"])
@admin_required
def get_app_shares(container_id):
    app = Application.query.filter_by(container_id=container_id).first_or_404()
    shared_user_ids = [user.id for user in app.shared_with]
    return jsonify(shared_user_ids)

@apps_bp.route("/apps/<container_id>/share", methods=["POST"])
@admin_required
def share_app(container_id):
    app = Application.query.filter_by(container_id=container_id).first_or_404()
    data = request.get_json()
    user_ids = data.get('user_ids', [])

    app.shared_with.clear()

    users_to_share_with = User.query.filter(User.id.in_(user_ids)).all()
    for user in users_to_share_with:
        app.shared_with.append(user)
    
    db.session.commit()
    return jsonify({"message": f"App '{app.name}' sharing updated."})

def start_app_refresh_scheduler(app):
    with app.app_context():
        print("Starting initial app data population...")
        refresh_apps_from_docker()
        print("Initial app data populated.")

    while True:
        time.sleep(5 * 60) # 5 minutes
        with app.app_context():
            print("Performing scheduled app data refresh...")
            refresh_apps_from_docker()
            print("Scheduled app data refresh complete.")