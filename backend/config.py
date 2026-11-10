
import os

from datetime import timedelta
from dotenv import load_dotenv


load_dotenv()


class Config:

    SECRET_KEY = os.getenv("SECRET_KEY")

    if not SECRET_KEY:
        raise RuntimeError(
            "SECRET_KEY is missing from the .env file."
        )

    ADMIN_EMAIL = os.getenv(
        "ADMIN_EMAIL",
        ""
    ).strip().lower()

    DB_HOST = os.getenv(
        "DB_HOST",
        "localhost"
    )

    DB_PORT = os.getenv(
        "DB_PORT",
        "3306"
    )

    DB_USER = os.getenv(
        "DB_USER",
        "root"
    )

    DB_PASSWORD = os.getenv(
        "DB_PASSWORD",
        ""
    )

    DB_NAME = os.getenv(
        "DB_NAME",
        "or_management"
    )

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SESSION_COOKIE_HTTPONLY = True

    SESSION_COOKIE_SAMESITE = "Lax"

    SESSION_COOKIE_SECURE = (
        os.getenv("SESSION_COOKIE_SECURE", "False").lower()
        == "true"
    )

    PERMANENT_SESSION_LIFETIME = timedelta(
        days=30
    )

    MAIL_SERVER = os.getenv(
        "MAIL_SERVER",
        "smtp.gmail.com"
    )

    MAIL_PORT = int(os.getenv(
        "MAIL_PORT",
        "465"
    ))

    MAIL_USERNAME = os.getenv(
        "MAIL_USERNAME",
        ""
    )

    MAIL_PASSWORD = os.getenv(
        "MAIL_PASSWORD",
        ""
    )

    MAIL_DEFAULT_SENDER = os.getenv(
        "MAIL_DEFAULT_SENDER",
        MAIL_USERNAME
    )
