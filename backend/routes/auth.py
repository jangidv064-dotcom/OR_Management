
from flask import (
    Blueprint,
    request,
    jsonify,
    session
)

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from models import db, User


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


def user_to_dict(user):

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_admin": bool(user.is_admin),
        "approval_status": user.approval_status
    }


# ==========================================
# REGISTER
# ==========================================

@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")

    if not name:
        return jsonify({
            "error": "Name is required."
        }), 400

    if len(name) > 100:
        return jsonify({
            "error": "Name must be 100 characters or fewer."
        }), 400

    if not email or "@" not in email:
        return jsonify({
            "error": "Enter a valid email address."
        }), 400

    if not isinstance(password, str) or len(password) < 8:
        return jsonify({
            "error": "Password must contain at least 8 characters."
        }), 400

    existing_user = User.query.filter_by(
        email=email
    ).first()

    if existing_user:
        return jsonify({
            "error": "An account with this email already exists."
        }), 409

    try:

        user = User(
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
            is_admin=False,
            approval_status="pending"
        )

        db.session.add(user)
        db.session.commit()

        return jsonify({
            "message": (
                "Registration request submitted successfully. "
                "Please wait for admin approval."
            )
        }), 201

    except Exception:

        db.session.rollback()

        return jsonify({
            "error": "Could not create your account."
        }), 500


# ==========================================
# LOGIN
# ==========================================

@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "error": "Email and password are required."
        }), 400

    user = User.query.filter_by(
        email=email
    ).first()

    if not user or not check_password_hash(
        user.password_hash,
        password
    ):
        return jsonify({
            "error": "Incorrect email or password."
        }), 401

    status = (user.approval_status or "").lower()

    if status == "pending":
        return jsonify({
            "error": (
                "Your account is awaiting admin approval. "
                "Please try again later."
            )
        }), 403

    if status == "rejected":
        return jsonify({
            "error": (
                "Your registration request was rejected. "
                "Please contact the administrator."
            )
        }), 403

    if status != "approved":
        return jsonify({
            "error": "Your account is not approved."
        }), 403

    session.clear()

    session["user_id"] = user.id
    session.permanent = True

    return jsonify({
        "message": "Login successful.",
        "user": user_to_dict(user)
    })


# ==========================================
# CURRENT USER
# ==========================================

@auth_bp.route("/me", methods=["GET"])
def current_user():

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({
            "error": "Not logged in."
        }), 401

    user = db.session.get(User, user_id)

    if not user:
        session.clear()

        return jsonify({
            "error": "Account not found."
        }), 401

    if user.approval_status != "approved":
        session.clear()

        return jsonify({
            "error": "Your account is not approved."
        }), 403

    return jsonify({
        "user": user_to_dict(user)
    })


# ==========================================
# LOGOUT
# ==========================================

@auth_bp.route("/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "message": "Logged out successfully."
    })
