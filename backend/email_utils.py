
import smtplib

from email.message import EmailMessage
from flask import current_app


def send_account_status_email(user, status):

    if status not in ("approved", "rejected"):
        return False

    username = current_app.config.get("MAIL_USERNAME")
    password = current_app.config.get("MAIL_PASSWORD")
    sender = current_app.config.get("MAIL_DEFAULT_SENDER")
    server = current_app.config.get("MAIL_SERVER")
    port = current_app.config.get("MAIL_PORT")

    if not all([username, password, sender, server, port]):
        current_app.logger.error(
            "Email configuration is incomplete."
        )
        return False

    if status == "approved":

        subject = "Your Open Rails Act Manager Account Is Approved"

        body = f"""
Hello {user.name},

Good news! Your registration request for Open Rails Act Manager
has been approved.

You can now log in using your registered email address and password.

Welcome aboard!

Regards,
Open Rails Act Manager
Administration Team
"""

    else:

        subject = "Update on Your Open Rails Act Manager Registration"

        body = f"""
Hello {user.name},

Your registration request for Open Rails Act Manager
has unfortunately been rejected.

If you believe this was a mistake, please contact the administrator.

Regards,
Open Rails Act Manager
Administration Team
"""

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = user.email
    message.set_content(body)

    try:

        with smtplib.SMTP_SSL(
            server,
            port,
            timeout=20
        ) as smtp:

            smtp.login(username, password)
            smtp.send_message(message)

        current_app.logger.info(
            "Account status email sent to %s",
            user.email
        )

        return True

    except Exception:

        current_app.logger.exception(
            "Could not send account status email to %s",
            user.email
        )

        return False
