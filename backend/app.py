import os
from routes.admin import admin_bp

from flask import (
    Flask,
    send_from_directory,
    session,
    redirect,
    url_for
)

from config import Config
from models import db

from routes.activities import activities_bp
from routes.auth import auth_bp


BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

FRONTEND_DIR = os.path.join(
    BASE_DIR,
    "frontend"
)


def create_app():

    app = Flask(__name__)

    app.config.from_object(Config)

    app.config["PATH_UPLOAD_FOLDER"] = os.path.join(
        app.root_path,
        "uploads",
        "paths"
    )

    os.makedirs(
        app.config["PATH_UPLOAD_FOLDER"],
        exist_ok=True
    )

    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(activities_bp)
    app.register_blueprint(admin_bp)

    @app.route("/")
    def home():

        if "user_id" not in session:
            return redirect(url_for("login_page"))

        return send_from_directory(
            FRONTEND_DIR,
            "index.html"
        )

    @app.route("/login")
    def login_page():

        if "user_id" in session:
            return redirect(url_for("home"))

        return send_from_directory(
            FRONTEND_DIR,
            "login.html"
        )

    @app.route("/css/<path:filename>")
    def css_files(filename):

        return send_from_directory(
            os.path.join(FRONTEND_DIR, "css"),
            filename
        )

    @app.route("/js/<path:filename>")
    def js_files(filename):

        return send_from_directory(
            os.path.join(FRONTEND_DIR, "js"),
            filename
        )

    @app.route("/api/health")
    def health():

        try:
            db.session.execute(
                db.text("SELECT 1")
            )

            return {
                "status": "running",
                "database": "connected"
            }

        except Exception:

            return {
                "status": "error",
                "database": "disconnected"
            }, 500

    with app.app_context():
        db.create_all()

    return app


app = create_app()


if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )