
from functools import wraps

from flask import (
    session,
    jsonify,
    current_app
)

from models import db, User


def get_logged_in_user():

    user_id = session.get("user_id")

    if not user_id:
        return None

    return db.session.get(User, user_id)


def login_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        user = get_logged_in_user()

        if not user:
            session.clear()

            return jsonify({
                "error": "Please log in to continue."
            }), 401

        if user.approval_status != "approved":
            session.clear()

            return jsonify({
                "error": "Your account is not approved."
            }), 403

        return function(*args, **kwargs)

    return wrapper


def admin_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        user = get_logged_in_user()

        if not user:
            session.clear()

            return jsonify({
                "error": "Please log in to continue."
            }), 401

        if user.approval_status != "approved":
            session.clear()

            return jsonify({
                "error": "Your account is not approved."
            }), 403

        configured_admin = (
            current_app.config.get("ADMIN_EMAIL", "")
            .strip()
            .lower()
        )

        if (
            not user.is_admin
            or not configured_admin
            or user.email.lower() != configured_admin
        ):
            return jsonify({
                "error": "Admin access denied."
            }), 403

        return function(*args, **kwargs)

    return wrapper
