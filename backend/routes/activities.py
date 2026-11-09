import os
import uuid

from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename

from models import db, Activity, Section, TrainEntry


activities_bp = Blueprint(
    "activities",
    __name__,
    url_prefix="/api/activities"
)


def activity_to_dict(activity):

    result = {
        "id": activity.id,
        "name": activity.name,
        "route": activity.route,
        "day": activity.day,
        "updatedAt": activity.updated_at.isoformat()
        if activity.updated_at else None,
        "sections": []
    }

    for section in activity.sections:

        section_data = {
            "id": section.id,
            "name": section.name,
            "entries": []
        }

        for entry in section.entries:

            path_file = None

            if entry.path_storage_name:

                file_path = os.path.join(
                    current_app.config["PATH_UPLOAD_FOLDER"],
                    entry.path_storage_name
                )

                content = ""

                if os.path.exists(file_path):
                    with open(
                        file_path,
                        "r",
                        encoding="utf-8"
                    ) as file:
                        content = file.read()

                path_file = {
                    "name": entry.path_original_name,
                    "content": content
                }

            section_data["entries"].append({
                "id": entry.id,
                "train": entry.train,
                "time": entry.time,
                "info": entry.info,
                "consist": entry.consist,
                "pathFile": path_file
            })

        result["sections"].append(section_data)

    return result

def save_path_file(entry, path_data):

    if not path_data:
        return

    filename = secure_filename(
        path_data.get("name", "activity-path.pat")
    )

    content = path_data.get("content")

    if not filename.lower().endswith(".pat"):
        raise ValueError("Only .pat files are allowed.")

    if not isinstance(content, str):
        raise ValueError("Invalid .pat file content.")

    upload_folder = current_app.config["PATH_UPLOAD_FOLDER"]

    os.makedirs(upload_folder, exist_ok=True)

    storage_name = f"{uuid.uuid4().hex}.pat"

    file_path = os.path.join(upload_folder, storage_name)

    with open(file_path, "w", encoding="utf-8") as file:
        file.write(content)

    entry.path_original_name = filename
    entry.path_storage_name = storage_name


def delete_path_file(entry):

    if not entry.path_storage_name:
        return

    file_path = os.path.join(
        current_app.config["PATH_UPLOAD_FOLDER"],
        entry.path_storage_name
    )

    if os.path.exists(file_path):
        os.remove(file_path)


def replace_activity_data(activity, data):

    activity.name = data.get("name", "").strip()
    activity.route = data.get("route", "").strip()
    activity.day = data.get("day", "")

    for section in list(activity.sections):
        for entry in list(section.entries):
            delete_path_file(entry)

    activity.sections.clear()

    for section_data in data.get("sections", []):

        section = Section(
            name=section_data.get("name", "").strip()
        )

        for entry_data in section_data.get("entries", []):

            entry = TrainEntry(
                train=entry_data.get("train", ""),
                time=entry_data.get("time", ""),
                info=entry_data.get("info", ""),
                consist=entry_data.get("consist", "")
            )

            save_path_file(
                entry,
                entry_data.get("pathFile")
            )

            section.entries.append(entry)

        activity.sections.append(section)


@activities_bp.route("", methods=["GET"])
def get_activities():

    activities = Activity.query.order_by(
        Activity.updated_at.desc()
    ).all()

    return jsonify([
        activity_to_dict(activity)
        for activity in activities
    ])


@activities_bp.route("", methods=["POST"])
def create_activity():

    data = request.get_json(silent=True) or {}

    if not data.get("name", "").strip():
        return jsonify({"error": "Activity name is required."}), 400

    activity = Activity()

    try:
        replace_activity_data(activity, data)

        db.session.add(activity)
        db.session.commit()

        return jsonify(activity_to_dict(activity)), 201

    except Exception as error:
        db.session.rollback()
        current_app.logger.exception("Activity creation failed")

        return jsonify({"error": str(error)}), 500


@activities_bp.route("/<int:activity_id>", methods=["GET"])
def get_activity(activity_id):

    activity = db.session.get(Activity, activity_id)

    if not activity:
        return jsonify({"error": "Activity not found."}), 404

    return jsonify(activity_to_dict(activity))


@activities_bp.route("/<int:activity_id>", methods=["PUT"])
def update_activity(activity_id):

    activity = db.session.get(Activity, activity_id)

    if not activity:
        return jsonify({"error": "Activity not found."}), 404

    data = request.get_json(silent=True) or {}

    if not data.get("name", "").strip():
        return jsonify({"error": "Activity name is required."}), 400

    try:
        replace_activity_data(activity, data)
        db.session.commit()

        return jsonify(activity_to_dict(activity))

    except Exception as error:
        db.session.rollback()
        current_app.logger.exception("Activity update failed")

        return jsonify({"error": str(error)}), 500


@activities_bp.route("/<int:activity_id>", methods=["DELETE"])
def delete_activity(activity_id):

    activity = db.session.get(Activity, activity_id)

    if not activity:
        return jsonify({"error": "Activity not found."}), 404

    try:
        for section in activity.sections:
            for entry in section.entries:
                delete_path_file(entry)

        db.session.delete(activity)
        db.session.commit()

        return jsonify({
            "message": "Activity deleted successfully."
        })

    except Exception as error:
        db.session.rollback()
        current_app.logger.exception("Activity deletion failed")

        return jsonify({"error": str(error)}), 500


@activities_bp.route(
    "/entries/<int:entry_id>/path",
    methods=["GET"]
)
def download_path_file(entry_id):

    entry = db.session.get(TrainEntry, entry_id)

    if not entry or not entry.path_storage_name:
        return jsonify({"error": "Path file not found."}), 404

    return send_from_directory(
        current_app.config["PATH_UPLOAD_FOLDER"],
        entry.path_storage_name,
        as_attachment=True,
        download_name=entry.path_original_name
    )