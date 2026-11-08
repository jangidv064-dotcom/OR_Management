import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
load_dotenv(PROJECT_ROOT / ".env")

db_user = quote_plus(os.getenv("DB_USER", "root"))
db_password = quote_plus(os.getenv("DB_PASSWORD", ""))
db_host = os.getenv("DB_HOST", "127.0.0.1")
db_port = os.getenv("DB_PORT", "3306")
db_name = os.getenv("DB_NAME", "or_activity_manager")

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}?charset=utf8mb4"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}

db = SQLAlchemy(app)


class Activity(db.Model):
    __tablename__ = "activities"

    id = db.Column(db.Integer, primary_key=True)
    activity_name = db.Column(db.String(150), nullable=False)
    route_name = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Draft")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        created_at = self.created_at
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        return {
            "id": self.id,
            "activity_name": self.activity_name,
            "route_name": self.route_name,
            "status": self.status,
            "created_at": created_at.isoformat() if created_at else None,
        }


@app.get("/")
def dashboard():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/css/<path:filename>")
def frontend_css(filename):
    return send_from_directory(FRONTEND_DIR / "css", filename)


@app.get("/js/<path:filename>")
def frontend_js(filename):
    return send_from_directory(FRONTEND_DIR / "js", filename)


@app.get("/api/health")
def health_check():
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({"api": "online", "database": "connected"}), 200
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"api": "online", "database": "disconnected"}), 503


@app.get("/api/activities")
def get_activities():
    try:
        activities = Activity.query.order_by(Activity.created_at.desc()).all()
        return jsonify([activity.to_dict() for activity in activities]), 200
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Could not fetch activities. Check the MySQL connection and database setup."}), 503


@app.post("/api/activities")
def create_activity():
    data = request.get_json(silent=True) or {}
    activity_name = str(data.get("activity_name", "")).strip()
    route_name = str(data.get("route_name", "")).strip()

    if not activity_name or not route_name:
        return jsonify({"error": "Activity name and route name are required."}), 400

    if len(activity_name) > 150 or len(route_name) > 150:
        return jsonify({"error": "Activity name and route name must be 150 characters or fewer."}), 400

    activity = Activity(
        activity_name=activity_name,
        route_name=route_name,
        status="Draft",
    )

    try:
        db.session.add(activity)
        db.session.commit()
        return jsonify(activity.to_dict()), 201
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Could not save activity. Check the MySQL connection and database setup."}), 503


if __name__ == "__main__":
    try:
        with app.app_context():
            db.create_all()
            print("Database tables are ready.")
    except SQLAlchemyError as error:
        print(f"Database is not ready yet: {error}")

    app.run(host="127.0.0.1", port=5000, debug=True)
