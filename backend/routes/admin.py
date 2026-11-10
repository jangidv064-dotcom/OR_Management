
from flask import Blueprint, jsonify

from models import db, User
from auth_utils import admin_required
from email_utils import send_account_status_email


admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api/admin"
)


# ==========================================
# GET PENDING REQUESTS
# ==========================================

@admin_bp.route("/requests", methods=["GET"])
@admin_required
def get_pending_requests():

    users = User.query.filter_by(
        approval_status="pending",
        is_admin=False
    ).order_by(
        User.created_at.asc()
    ).all()

    requests = []

    for user in users:

        requests.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "created_at": (
                user.created_at.isoformat()
                if user.created_at else None
            )
        })

    return jsonify({
        "requests": requests,
        "total": len(requests)
    })


# ==========================================
# APPROVE USER
# ==========================================

@admin_bp.route(
    "/users/<int:user_id>/approve",
    methods=["POST"]
)
@admin_required
def approve_user(user_id):

    user = db.session.get(User, user_id)

    if not user:
        return jsonify({
            "error": "User not found."
        }), 404

    if user.is_admin:
        return jsonify({
            "error": "Admin accounts cannot be modified here."
        }), 403

    if user.approval_status != "pending":
        return jsonify({
            "error": "This request is no longer pending."
        }), 409

    try:

        user.approval_status = "approved"
        db.session.commit()

    except Exception:

        db.session.rollback()

        return jsonify({
            "error": "Could not approve this user."
        }), 500

    email_sent = send_account_status_email(
        user,
        "approved"
    )

    return jsonify({
        "message": "User approved successfully.",
        "email_sent": email_sent,
        "email_message": (
            "Approval email sent successfully."
            if email_sent
            else "User approved, but email could not be sent."
        )
    })


# ==========================================
# REJECT USER
# ==========================================

@admin_bp.route(
    "/users/<int:user_id>/reject",
    methods=["POST"]
)
@admin_required
def reject_user(user_id):

    user = db.session.get(User, user_id)

    if not user:
        return jsonify({
            "error": "User not found."
        }), 404

    if user.is_admin:
        return jsonify({
            "error": "Admin accounts cannot be rejected here."
        }), 403

    if user.approval_status != "pending":
        return jsonify({
            "error": "This request is no longer pending."
        }), 409

    try:

        user.approval_status = "rejected"
        db.session.commit()

    except Exception:

        db.session.rollback()

        return jsonify({
            "error": "Could not reject this request."
        }), 500

    email_sent = send_account_status_email(
        user,
        "rejected"
    )

    return jsonify({
        "message": "Registration request rejected.",
        "email_sent": email_sent,
        "email_message": (
            "Rejection email sent successfully."
            if email_sent
            else "Request rejected, but email could not be sent."
        )
    })
