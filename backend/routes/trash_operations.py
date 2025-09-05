from flask import Blueprint, jsonify, request, session
import os
import stat
import shutil
import json
import uuid
from datetime import datetime
from decorators import login_required
from helpers import get_user_and_base_path, resolve_user_path, cleanup_trash

trash_operations_bp = Blueprint('trash_operations', __name__)

@trash_operations_bp.route("/files/delete", methods=["POST"])
@login_required
def delete_item():
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    user_paths = request.json.get('paths')
    if not user_paths or not isinstance(user_paths, list): return jsonify({"error": "A list of paths is required"}), 400
    user_trash_path = os.path.join('/data/.trash', str(user.id))
    os.makedirs(user_trash_path, exist_ok=True)
    errors = []
    for user_path in user_paths:
        real_path = resolve_user_path(base_path, is_sandboxed, user_path)
        if not real_path or not os.path.exists(real_path):
            errors.append(f"Path not found: {user_path}")
            continue
        try:
            trashed_name = str(uuid.uuid4())
            trash_info = {"original_path": user_path, "original_name": os.path.basename(real_path), "deleted_at": datetime.utcnow().isoformat()}
            with open(os.path.join(user_trash_path, f"{trashed_name}.trashinfo"), 'w') as f: json.dump(trash_info, f)
            shutil.move(real_path, os.path.join(user_trash_path, trashed_name))
        except Exception as e: errors.append(f"Could not trash {user_path}: {e}")
    if errors: return jsonify({"error": "\n".join(errors)}), 500
    return jsonify({"success": True})

@trash_operations_bp.route("/files/trash", methods=["GET"])
@login_required
def get_trash_items():
    user, _, _ = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    cleanup_trash(user)
    user_trash_path = os.path.join('/data/.trash', str(user.id))
    if not os.path.exists(user_trash_path): return jsonify([])
    items = []
    for item_name in sorted(os.listdir(user_trash_path)):
        if item_name.endswith('.trashinfo'):
            info_file_path = os.path.join(user_trash_path, item_name)
            trashed_item_name = item_name.replace('.trashinfo', '')
            trashed_item_path = os.path.join(user_trash_path, trashed_item_name)
            if not os.path.exists(trashed_item_path): continue
            try:
                with open(info_file_path, 'r') as f: info = json.load(f)
                stat_info = os.stat(trashed_item_path)
                items.append({
                    "name": info.get('original_name', 'Unknown'), "trashed_name": trashed_item_name,
                    "original_path": info.get('original_path', 'Unknown'), "deleted_at": info.get('deleted_at', 'Unknown'),
                    "type": 'dir' if stat.S_ISDIR(stat_info.st_mode) else 'file', "size": stat_info.st_size,
                })
            except (json.JSONDecodeError, KeyError, OSError): continue
    return jsonify(items)

@trash_operations_bp.route("/files/trash/restore", methods=["POST"])
@login_required
def restore_trash_items():
    user, base_path, is_sandboxed = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    trashed_names = request.json.get('trashed_names')
    if not trashed_names or not isinstance(trashed_names, list): return jsonify({"error": "List of trashed names required"}), 400
    user_trash_path = os.path.join('/data/.trash', str(user.id))
    errors = []
    for trashed_name in trashed_names:
        info_file_path = os.path.join(user_trash_path, f"{trashed_name}.trashinfo")
        trashed_item_path = os.path.join(user_trash_path, trashed_name)
        if not os.path.exists(info_file_path) or not os.path.exists(trashed_item_path):
            errors.append(f"Trashed item not found: {trashed_name}")
            continue
        try:
            with open(info_file_path, 'r') as f: info = json.load(f)
            restore_real_path = resolve_user_path(base_path, is_sandboxed, info['original_path'])
            if not restore_real_path:
                errors.append(f"Invalid restore path for {info.get('original_name')}")
                continue
            if os.path.exists(restore_real_path):
                errors.append(f"Item already exists at original location for {info.get('original_name')}")
                continue
            os.makedirs(os.path.dirname(restore_real_path), exist_ok=True)
            shutil.move(trashed_item_path, restore_real_path)
            os.remove(info_file_path)
        except Exception as e: errors.append(f"Could not restore {info.get('original_name', trashed_name)}: {e}")
    if errors: return jsonify({"error": "\n".join(errors)}), 500
    return jsonify({"success": True})

@trash_operations_bp.route("/files/trash/delete_permanently", methods=["POST"])
@login_required
def delete_trash_items_permanently():
    user, _, _ = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    trashed_names = request.json.get('trashed_names')
    if not trashed_names or not isinstance(trashed_names, list): return jsonify({"error": "List of trashed names required"}), 400
    user_trash_path = os.path.join('/data/.trash', str(user.id))
    errors = []
    for trashed_name in trashed_names:
        info_file_path = os.path.join(user_trash_path, f"{trashed_name}.trashinfo")
        trashed_item_path = os.path.join(user_trash_path, trashed_name)
        try:
            if os.path.exists(trashed_item_path):
                if os.path.isdir(trashed_item_path): shutil.rmtree(trashed_item_path)
                else: os.remove(trashed_item_path)
            if os.path.exists(info_file_path): os.remove(info_file_path)
        except Exception as e: errors.append(f"Could not delete {trashed_name}: {e}")
    if errors: return jsonify({"error": "\n".join(errors)}), 500
    return jsonify({"success": True})

@trash_operations_bp.route("/files/trash/empty", methods=["POST"])
@login_required
def empty_trash():
    user, _, _ = get_user_and_base_path()
    if not user: return jsonify({"error": "User not found"}), 404
    user_trash_path = os.path.join('/data/.trash', str(user.id))
    if os.path.exists(user_trash_path):
        try:
            shutil.rmtree(user_trash_path)
            os.makedirs(user_trash_path)
        except Exception as e: return jsonify({"error": str(e)}), 500
    return jsonify({"success": True})