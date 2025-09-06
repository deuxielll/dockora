from flask import Blueprint, jsonify, request, Response, stream_with_context, current_app
from models import SystemSetting
from decorators import admin_required
from extensions import db
import paramiko
import socket

ssh_bp = Blueprint('ssh', __name__)

@ssh_bp.route("/system/ssh-settings", methods=["GET"])
@admin_required
def get_ssh_settings():
    settings = SystemSetting.query.filter(SystemSetting.key.like('ssh_%')).all()
    settings_dict = {s.key: s.value for s in settings}
    return jsonify(settings_dict)

@ssh_bp.route("/system/ssh-settings", methods=["POST"])
@admin_required
def set_ssh_settings():
    data = request.get_json()
    allowed_keys = ['ssh_host', 'ssh_port', 'ssh_username', 'ssh_password']
    
    for key, value in data.items():
        if key in allowed_keys:
            setting = SystemSetting.query.filter_by(key=key).first()
            if setting:
                setting.value = str(value)
            else:
                setting = SystemSetting(key=key, value=str(value))
                db.session.add(setting)
    
    db.session.commit()
    return jsonify({"message": "SSH settings saved successfully."})

@ssh_bp.route("/system/ssh/execute-command", methods=["POST"])
@admin_required
def execute_ssh_command():
    data = request.get_json()
    host = data.get('host')
    port = int(data.get('port', 22))
    username = data.get('username')
    password = data.get('password')
    command = data.get('command')

    if not all([host, username, command]):
        return jsonify({"error": "Host, username, and command are required."}), 400

    def generate_output():
        client = None
        try:
            yield "[DOCKORA_STREAM_INFO]Attempting SSH connection...\n"
            client = paramiko.SSHClient()
            client.load_system_host_keys()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            client.connect(hostname=host, port=port, username=username, password=password, timeout=10)
            yield f"[DOCKORA_STREAM_INFO]Connected to {username}@{host}:{port}. Executing command...\n"

            stdin, stdout, stderr = client.exec_command(command, get_pty=True)
            
            for line in iter(stdout.readline, ""):
                yield line
            
            for line in iter(stderr.readline, ""):
                yield f"[DOCKORA_STREAM_ERROR]{line}"

            exit_status = stdout.channel.recv_exit_status()
            if exit_status == 0:
                yield "[DOCKORA_STREAM_SUCCESS]Command executed successfully.\n"
            else:
                yield f"[DOCKORA_STREAM_ERROR]Command exited with status {exit_status}.\n"

        except paramiko.AuthenticationException:
            yield "[DOCKORA_STREAM_ERROR]Authentication failed. Check username and password.\n"
        except paramiko.SSHException as e:
            yield f"[DOCKORA_STREAM_ERROR]SSH connection or command execution failed: {e}\n"
        except socket.timeout:
            yield "[DOCKORA_STREAM_ERROR]Connection timed out. Host might be unreachable or port is closed.\n"
        except Exception as e:
            yield f"[DOCKORA_STREAM_ERROR]An unexpected error occurred: {e}\n"
        finally:
            if client:
                client.close()
                yield "[DOCKORA_STREAM_INFO]SSH connection closed.\n"

    return Response(stream_with_context(generate_output()), mimetype='text/plain')