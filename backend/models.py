from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Activity(db.Model):

    __tablename__ = "activities"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(150), nullable=False)
    route = db.Column(db.String(150))
    day = db.Column(db.String(20))

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    sections = db.relationship(
        "Section",
        backref="activity",
        cascade="all, delete-orphan",
        order_by="Section.id"
    )


class Section(db.Model):

    __tablename__ = "sections"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(120), nullable=False)

    activity_id = db.Column(
        db.Integer,
        db.ForeignKey("activities.id", ondelete="CASCADE"),
        nullable=False
    )

    entries = db.relationship(
        "TrainEntry",
        backref="section",
        cascade="all, delete-orphan",
        order_by="TrainEntry.id"
    )


class TrainEntry(db.Model):

    __tablename__ = "train_entries"

    id = db.Column(db.Integer, primary_key=True)

    train = db.Column(db.String(200))
    time = db.Column(db.String(150))
    info = db.Column(db.Text)
    consist = db.Column(db.String(200))

    path_original_name = db.Column(db.String(255))
    path_storage_name = db.Column(db.String(255))

    section_id = db.Column(
        db.Integer,
        db.ForeignKey("sections.id", ondelete="CASCADE"),
        nullable=False
    )