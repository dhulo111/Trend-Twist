"""
FCM Push Notification Service
Sends push notifications via FCM HTTP v1 Legacy API.
Set FCM_SERVER_KEY in your .env file (from Firebase Console → Project Settings → Cloud Messaging).
"""
import requests
import json
import logging
import os

logger = logging.getLogger(__name__)

FCM_URL = 'https://fcm.googleapis.com/fcm/send'


def send_fcm_notification(user, title: str, body: str, data: dict = None):
    """
    Send a push notification to all FCM devices registered for `user`.

    All values in `data` are coerced to strings as required by FCM.
    If FCM_SERVER_KEY is not set, logs a warning but does not raise.
    """
    server_key = os.environ.get('FCM_SERVER_KEY')
    if not server_key:
        logger.warning(
            f"[FCM] FCM_SERVER_KEY not configured. "
            f"Notification '{title}' for {user.username} skipped."
        )
        return

    devices = list(user.fcm_devices.values_list('registration_id', flat=True))
    if not devices:
        logger.debug(f"[FCM] No devices for {user.username}")
        return

    # FCM requires all data values to be strings
    safe_data = {k: str(v) for k, v in (data or {}).items()}

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'key={server_key}',
    }

    for token in devices:
        payload = {
            'to': token,
            'priority': 'high',
            'notification': {
                'title': title,
                'body': body,
                'sound': 'default',
                'badge': '1',
            },
            'data': safe_data,
        }
        try:
            resp = requests.post(
                FCM_URL,
                headers=headers,
                data=json.dumps(payload),
                timeout=5,
            )
            if resp.status_code == 200:
                result = resp.json()
                if result.get('failure', 0) > 0:
                    # Token is invalid — delete it
                    logger.warning(f"[FCM] Invalid token for {user.username}, removing.")
                    user.fcm_devices.filter(registration_id=token).delete()
                else:
                    logger.info(f"[FCM] Sent to {user.username}")
            else:
                logger.error(f"[FCM] HTTP {resp.status_code}: {resp.text}")
        except Exception as exc:
            logger.error(f"[FCM] Exception: {exc}")


def send_call_notification(caller, recipient, call_type: str, signal_data: dict):
    """Convenience wrapper for incoming call push notifications."""
    send_fcm_notification(
        user=recipient,
        title=f"Incoming {call_type.capitalize()} Call",
        body=f"{caller.username} is calling you",
        data={
            'type': 'call_offer',
            'caller_id': str(caller.id),
            'caller_username': caller.username,
            'caller_profile_picture': (
                caller.profile.profile_picture.url
                if hasattr(caller, 'profile') and caller.profile.profile_picture
                else ''
            ),
            'call_type': call_type,
        },
    )


def send_message_notification(sender, recipient, content: str):
    """Convenience wrapper for new message push notifications."""
    send_fcm_notification(
        user=recipient,
        title=sender.username,
        body=content[:100],
        data={
            'type': 'chat_message',
            'sender_id': str(sender.id),
            'sender_username': sender.username,
            'sender_profile_picture': (
                sender.profile.profile_picture.url
                if hasattr(sender, 'profile') and sender.profile.profile_picture
                else ''
            ),
            'content': content[:100],
        },
    )
