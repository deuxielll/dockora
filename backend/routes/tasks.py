from flask import Blueprint, jsonify, request, session
from models import Task
from extensions import db
from decorators import login_required

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route("/tasks", methods=["GET"])
@login_required
def get_tasks():
    user_id = session.get('user_id')
    tasks = Task.query.filter_by(user_id=user_id).order_by(Task.created_at.desc()).all()
    return jsonify([{
        "id": task.id,
        "text": task.text,
        "completed": task.completed
    } for task in tasks])

@tasks_bp.route("/tasks", methods=["POST"])
@login_required
def create_task():
    user_id = session.get('user_id')
    data = request.get_json()
    text = data.get('text')
    if not text:
        return jsonify({"error": "Task text is required"}), 400
    
    new_task = Task(user_id=user_id, text=text)
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify({
        "id": new_task.id,
        "text": new_task.text,
        "completed": new_task.completed
    }), 201

@tasks_bp.route("/tasks/<int:task_id>", methods=["PUT"])
@login_required
def update_task(task_id):
    user_id = session.get('user_id')
    task = Task.query.filter_by(id=task_id, user_id=user_id).first_or_404()
    
    data = request.get_json()
    if 'completed' in data:
        task.completed = data['completed']
    
    db.session.commit()
    return jsonify({"message": "Task updated successfully."})

@tasks_bp.route("/tasks/<int:task_id>", methods=["DELETE"])
@login_required
def delete_task(task_id):
    user_id = session.get('user_id')
    task = Task.query.filter_by(id=task_id, user_id=user_id).first_or_404()
    
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully."})

@tasks_bp.route("/tasks/clear-completed", methods=["POST"])
@login_required
def clear_completed_tasks():
    user_id = session.get('user_id')
    Task.query.filter_by(user_id=user_id, completed=True).delete()
    db.session.commit()
    return jsonify({"message": "Completed tasks cleared."})