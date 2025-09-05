from flask import Blueprint, jsonify, request, session
from decorators import login_required
from extensions import db
from models import CustomWidget

custom_widgets_bp = Blueprint('custom_widgets', __name__)

@custom_widgets_bp.route("/custom-widgets", methods=["POST"])
@login_required
def create_custom_widget():
    user_id = session.get('user_id')
    data = request.get_json()
    name = data.get('name')
    code = data.get('code')
    language = data.get('language', 'html')

    if not name or not code:
        return jsonify({"error": "Name and code are required"}), 400

    new_widget = CustomWidget(user_id=user_id, name=name, code=code, language=language)
    db.session.add(new_widget)
    db.session.commit()
    return jsonify({
        "id": new_widget.id,
        "name": new_widget.name,
        "language": new_widget.language,
        "created_at": new_widget.created_at.isoformat()
    }), 201

@custom_widgets_bp.route("/custom-widgets", methods=["GET"])
@login_required
def get_custom_widgets():
    user_id = session.get('user_id')
    widgets = CustomWidget.query.filter_by(user_id=user_id).order_by(CustomWidget.name).all()
    return jsonify([{
        "id": w.id,
        "name": w.name,
        "language": w.language,
        "created_at": w.created_at.isoformat(),
        "updated_at": w.updated_at.isoformat()
    } for w in widgets])

@custom_widgets_bp.route("/custom-widgets/<int:widget_id>", methods=["GET"])
@login_required
def get_custom_widget(widget_id):
    user_id = session.get('user_id')
    widget = CustomWidget.query.filter_by(id=widget_id, user_id=user_id).first_or_404()
    return jsonify({
        "id": widget.id,
        "name": widget.name,
        "code": widget.code,
        "language": widget.language,
        "created_at": widget.created_at.isoformat(),
        "updated_at": widget.updated_at.isoformat()
    })

@custom_widgets_bp.route("/custom-widgets/<int:widget_id>", methods=["PUT"])
@login_required
def update_custom_widget(widget_id):
    user_id = session.get('user_id')
    widget = CustomWidget.query.filter_by(id=widget_id, user_id=user_id).first_or_404()
    data = request.get_json()
    widget.name = data.get('name', widget.name)
    widget.code = data.get('code', widget.code)
    widget.language = data.get('language', widget.language)
    db.session.commit()
    return jsonify({"message": "Widget updated successfully."})

@custom_widgets_bp.route("/custom-widgets/<int:widget_id>", methods=["DELETE"])
@login_required
def delete_custom_widget(widget_id):
    user_id = session.get('user_id')
    widget = CustomWidget.query.filter_by(id=widget_id, user_id=user_id).first_or_404()
    db.session.delete(widget)
    db.session.commit()
    return jsonify({"message": "Widget deleted successfully."})