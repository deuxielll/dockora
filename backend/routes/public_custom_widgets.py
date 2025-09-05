from flask import Blueprint, render_template
from models import CustomWidget

public_custom_widgets_bp = Blueprint('public_custom_widgets', __name__)

@public_custom_widgets_bp.route("/custom-widget-renderer/<int:widget_id>")
def custom_widget_renderer(widget_id):
    widget = CustomWidget.query.get(widget_id)
    if not widget:
        return "Widget not found", 404
    
    return render_template('custom_widget_renderer.html', widget_data={
        "id": widget.id,
        "name": widget.name,
        "code": widget.code,
        "language": widget.language
    })