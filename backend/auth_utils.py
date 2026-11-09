from functools import wraps

from flask import session, jsonify


def login_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        if "user_id" not in session:
            return jsonify({
                "error": "Please log in to continue."
            }), 401

        return function(*args, **kwargs)

    return wrapper