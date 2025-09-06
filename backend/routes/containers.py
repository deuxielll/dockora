from flask import Blueprint, jsonify, request, Response, stream_with_context
import docker
import subprocess
import tempfile
import shutil
import os
from datetime import datetime, timedelta
from extensions import client, db
from models import User, Notification, Stack, ContainerStatus
from decorators import admin_required
from helpers.container_helpers import parse_cpu_limit, parse_memory_limit # Updated import

containers_bp = Blueprint('containers', __name__)

@containers_bp.route("/containers", methods=["GET"])
@admin_required
def list_containers():
    containers = client.containers.list(all=True)
    
    statuses_from_db = {cs.id: cs for cs in ContainerStatus.query.all()}
    current_container_ids = {c.short_id for c in containers}

    for c in containers:
        db_status_obj = statuses_from_db.get(c.short_id)
        previous_status = db_status_obj.status if db_status_obj else None
        current_status = c.status
        
        if previous_status and 'running' in previous_status and 'exited' in current_status:
            admins = User.query.filter_by(role='admin').all()
            for admin in admins:
                recent_notif = Notification.query.filter(
                    Notification.user_id == admin.id,
                    Notification.message.like(f"%Container '{c.name}' stopped unexpectedly.%"),
                    Notification.created_at > datetime.utcnow() - timedelta(minutes=1)
                ).first()
                if not recent_notif:
                    notif = Notification(
                        user_id=admin.id,
                        message=f"Container '{c.name}' stopped unexpectedly.",
                        type='warning'
                    )
                    db.session.add(notif)
        
        if db_status_obj:
            db_status_obj.status = current_status
        else:
            new_status = ContainerStatus(id=c.short_id, status=current_status)
            db.session.add(new_status)

    stale_ids = set(statuses_from_db.keys()) - current_container_ids
    if stale_ids:
        ContainerStatus.query.filter(ContainerStatus.id.in_(stale_ids)).delete(synchronize_session=False)

    db.session.commit()

    result = []
    for c in containers:
        ports = c.attrs.get('NetworkSettings', {}).get('Ports', {})
        port_mappings = []
        if ports:
            for container_port, host_bindings in ports.items():
                if host_bindings:
                    for binding in host_bindings:
                        host_ip = binding.get('HostIp', '')
                        host_port = binding.get('HostPort', '')
                        if not host_ip or host_ip == '::': host_ip = '0.0.0.0'
                        if host_port: port_mappings.append(f"{host_ip}:{host_port}->{container_port}")

        host_config = c.attrs.get('HostConfig', {})
        nano_cpus = host_config.get('NanoCpus')
        cpus = f"{nano_cpus / 1_000_000_000:.2f}" if nano_cpus else "N/A"

        memory_limit_bytes = host_config.get('Memory')
        if memory_limit_bytes == 0 or memory_limit_bytes is None:
            memory_limit = "Unlimited"
        else:
            if memory_limit_bytes >= 1024**3: memory_limit = f"{memory_limit_bytes / 1024**3:.2f} GB"
            elif memory_limit_bytes >= 1024**2: memory_limit = f"{memory_limit_bytes / 1024**2:.2f} MB"
            else: memory_limit = f"{memory_limit_bytes / 1024:.2f} KB"

        stats = {"cpu_percent": 0, "memory_percent": 0, "memory_usage": 0}
        if c.status == 'running':
            try:
                s = c.stats(stream=False)
                cpu_delta = s['cpu_stats']['cpu_usage']['total_usage'] - s['precpu_stats']['cpu_usage']['total_usage']
                system_cpu_delta = s['cpu_stats']['system_cpu_usage'] - s['precpu_stats']['system_cpu_usage']
                if system_cpu_delta > 0.0 and cpu_delta > 0.0:
                    number_cpus = s['cpu_stats']['online_cpus']
                    stats['cpu_percent'] = (cpu_delta / system_cpu_delta) * number_cpus * 100.0
                if 'usage' in s['memory_stats'] and 'limit' in s['memory_stats']:
                    mem_usage, mem_limit = s['memory_stats']['usage'], s['memory_stats']['limit']
                    if mem_limit > 0:
                        stats['memory_percent'] = (mem_usage / mem_limit) * 100.0
                        stats['memory_usage'] = mem_usage
            except (KeyError, ZeroDivisionError): pass

        result.append({
            "id": c.short_id, "name": c.name, "status": c.status,
            "image": c.image.tags[0] if c.image.tags else c.image.short_id,
            "ports": port_mappings, "cpus": cpus, "memory_limit": memory_limit,
            "stats": stats, "stack_name": c.labels.get('com.docker.compose.project')
        })
    return jsonify(result)

@containers_bp.route("/containers/create", methods=["POST"])
@admin_required
def create_container():
    data = request.get_json()
    image, name = data.get("image"), data.get("name")
    if not image: return jsonify({"error": "Image is required"}), 400
    try:
        container = client.containers.run(image, name=name, detach=True)
        return jsonify({"id": container.short_id, "name": container.name})
    except docker.errors.ImageNotFound:
        try:
            client.images.pull(image)
            container = client.containers.run(image, name=name, detach=True)
            return jsonify({"id": container.short_id, "name": container.name})
        except Exception as e: return jsonify({"error": str(e)}), 500
    except Exception as e: return jsonify({"error": str(e)}), 500

@containers_bp.route("/containers/<id>/<action>", methods=["POST"])
@admin_required
def manage_container(id, action):
    try:
        container = client.containers.get(id)
        actions = {"start": container.start, "stop": container.stop, "restart": container.restart, "pause": container.pause, "unpause": container.unpause}
        if action in actions:
            actions[action]()
        elif action == "remove":
            stack_name = container.labels.get('com.docker.compose.project')
            if stack_name:
                stack = Stack.query.filter_by(name=stack_name).first()
                if stack:
                    temp_dir = tempfile.mkdtemp()
                    try:
                        with open(os.path.join(temp_dir, 'docker-compose.yml'), 'w') as f: f.write(stack.compose_content)
                        if stack.env_content:
                            with open(os.path.join(temp_dir, '.env'), 'w') as f: f.write(stack.env_content)
                        subprocess.run(['docker', 'compose', '-p', stack_name, 'down', '--remove-orphans'], cwd=temp_dir, capture_output=True, text=True)
                        db.session.delete(stack)
                        db.session.commit()
                    finally: shutil.rmtree(temp_dir)
                else: subprocess.run(['docker', 'compose', '-p', stack_name, 'down', '--remove-orphans'], capture_output=True, text=True)
            else: container.remove(force=True)
        else: return jsonify({"error": "Invalid action"}), 400
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500

@containers_bp.route("/containers/<id>/rename", methods=["POST"])
@admin_required
def rename_container(id):
    try:
        container = client.containers.get(id)
        new_name = request.json.get("name")
        if not new_name: return jsonify({"error": "New name is required"}), 400
        container.rename(new_name)
        return jsonify({"success": True, "message": f"Container renamed to '{new_name}'"})
    except docker.errors.NotFound: return jsonify({"error": "Container not found"}), 404
    except docker.errors.APIError as e:
        if e.response.status_code == 409: return jsonify({"error": f"The name '{new_name}' is already in use."}), 409
        return jsonify({"error": str(e)}), 500
    except Exception as e: return jsonify({"error": str(e)}), 500

@containers_bp.route("/containers/<id>/logs", methods=["GET"])
@admin_required
def get_logs(id):
    try:
        container = client.containers.get(id)
        return jsonify({"logs": container.logs(tail=100).decode("utf-8")})
    except Exception as e: return jsonify({"error": str(e)}), 500

@containers_bp.route("/containers/<id>/stream-logs", methods=["GET"])
@admin_required
def stream_logs(id):
    def generate():
        try:
            container = client.containers.get(id)
            for line in container.logs(stream=True, follow=True, tail=50):
                yield line.decode('utf-8')
        except docker.errors.NotFound:
            yield f"[DOCKORA_STREAM_ERROR]Container '{id}' not found.\n"
        except Exception as e:
            yield f"[DOCKORA_STREAM_ERROR]An error occurred while streaming logs: {str(e)}\n"

    return Response(stream_with_context(generate()), mimetype='text/plain')

def parse_ports(port_strings):
    port_dict = {}
    if not port_strings: return None
    for port_string in port_strings:
        try:
            host_port_str, container_port_str = port_string.split(':')
            container_port, protocol = container_port_str.split('/') if '/' in container_port_str else (container_port_str, 'tcp')
            port_dict[f"{container_port}/{protocol}"] = int(host_port_str)
        except (ValueError, IndexError): continue
    return port_dict

@containers_bp.route("/containers/<id>/recreate", methods=["POST"])
@admin_required
def recreate_container(id):
    try:
        container = client.containers.get(id)
        config, host_config = container.attrs['Config'], container.attrs['HostConfig']
        
        data = request.json
        new_ports = data.get("ports", [])
        new_cpu_limit_str = data.get("cpu_limit")
        new_memory_limit_str = data.get("memory_limit")

        # Parse new limits
        nano_cpus_limit = parse_cpu_limit(new_cpu_limit_str)
        mem_limit_bytes = parse_memory_limit(new_memory_limit_str)

        # Determine final CPU limit: if new_cpu_limit_str is provided (even empty), use parsed value. Otherwise, use existing.
        final_nano_cpus = nano_cpus_limit if new_cpu_limit_str is not None else host_config.get('NanoCpus')
        
        # Determine final memory limit: if new_memory_limit_str is provided (even empty), use parsed value. Otherwise, use existing.
        final_mem_limit = mem_limit_bytes if new_memory_limit_str is not None else host_config.get('Memory')

        if final_mem_limit == 0:
            final_mem_limit = None

        existing_binds = host_config.get('Binds')
        existing_restart_policy = host_config.get('RestartPolicy')
        restart_policy_dict = existing_restart_policy if existing_restart_policy else {'Name': 'no'}
        existing_network_mode = host_config.get('NetworkMode')
        existing_labels = config.get('Labels')

        new_container = client.containers.run(
            image=config.get('Image'),
            name=container.name,
            command=config.get('Cmd'),
            entrypoint=config.get('Entrypoint'),
            environment=config.get('Env'),
            volumes=existing_binds,
            restart_policy=restart_policy_dict,
            network_mode=existing_network_mode,
            labels=existing_labels,
            ports=parse_ports(new_ports),
            nano_cpus=final_nano_cpus,
            mem_limit=final_mem_limit,
            detach=True
        )
        container.stop()
        container.remove()
        return jsonify({"success": True, "id": new_container.short_id})
    except docker.errors.NotFound: return jsonify({"error": "Container not found"}), 404
    except Exception as e: return jsonify({"error": str(e)}), 500

@containers_bp.route("/stacks/create", methods=["POST"])
@admin_required
def create_stack():
    data = request.get_json()
    name, compose_content, env_content = data.get("name"), data.get("compose"), data.get("env")
    if not name or not compose_content:
        return Response("Stack name and compose content are required", status=400)
    
    temp_dir = tempfile.mkdtemp()
    
    def generate():
        try:
            with open(os.path.join(temp_dir, 'docker-compose.yml'), 'w') as f:
                f.write(compose_content)
            if env_content:
                with open(os.path.join(temp_dir, '.env'), 'w') as f:
                    f.write(env_content)
            
            process = subprocess.Popen(
                ['docker', 'compose', '-p', name, 'up', '-d', '--remove-orphans'],
                cwd=temp_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            for line in iter(process.stdout.readline, ''):
                yield line
            
            process.wait()
            
            if process.returncode == 0:
                stack = Stack.query.filter_by(name=name).first()
                if stack:
                    stack.compose_content, stack.env_content = compose_content, env_content
                else:
                    db.session.add(Stack(name=name, compose_content=compose_content, env_content=env_content))
                db.session.commit()
                yield "\n[DOCKORA_STREAM_SUCCESS]Deployment finished successfully."
            else:
                yield f"\n[DOCKORA_STREAM_ERROR]Deployment failed with exit code {process.returncode}"
        
        except Exception as e:
            yield f"\n[DOCKORA_STREAM_ERROR]An internal error occurred: {str(e)}"
        
        finally:
            shutil.rmtree(temp_dir)

    return Response(stream_with_context(generate()), mimetype='text/plain')

@containers_bp.route("/stacks/<name>", methods=["GET"])
@admin_required
def get_stack(name):
    stack = Stack.query.filter_by(name=name).first_or_404(description="Stack not found")
    return jsonify({"name": stack.name, "compose": stack.compose_content, "env": stack.env_content})

@containers_bp.route("/stacks/<name>", methods=["PUT"])
@admin_required
def update_stack(name):
    stack = Stack.query.filter_by(name=name).first_or_404(description="Stack not found")
    data = request.get_json()
    compose_content, env_content = data.get("compose"), data.get("env")
    if not compose_content: return jsonify({"error": "Compose content is required"}), 400
    stack.compose_content, stack.env_content = compose_content, env_content
    db.session.commit()
    temp_dir = tempfile.mkdtemp()
    try:
        with open(os.path.join(temp_dir, 'docker-compose.yml'), 'w') as f: f.write(compose_content)
        if env_content:
            with open(os.path.join(temp_dir, '.env'), 'w') as f: f.write(env_content)
        result = subprocess.run(['docker', 'compose', '-p', name, 'up', '-d', '--remove-orphans'], cwd=temp_dir, capture_output=True, text=True)
        output = result.stdout + result.stderr
        if result.returncode != 0: return jsonify({"error": f"Docker Compose failed:\n{output}"}), 500
        return jsonify({"success": True, "output": output})
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally: shutil.rmtree(temp_dir)

@containers_bp.route("/images", methods=["GET"])
@admin_required
def list_images():
    return jsonify([{"id": img.short_id.replace("sha256:", ""), "tags": img.tags, "size": img.attrs['Size']} for img in client.images.list()])

@containers_bp.route("/images/<id>", methods=["DELETE"])
@admin_required
def remove_image(id):
    try:
        client.images.remove(id, force=True)
        return jsonify({"success": True})
    except Exception as e: return jsonify({"error": str(e)}), 500