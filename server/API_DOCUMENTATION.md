# Trend Twist API Documentation

This document provides a comprehensive guide to the Trend Twist backend APIs, designed to assist in the development of the Android application.

## 1. General Information
- **Base URL**: `http://<server-ip>:8000/api/` (Replace with your actual server URL)
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token (JWT)
  - Headers: `Authorization: Bearer <access_token>`

---

## 2. Authentication & Security

### Login (Password)
- **URL**: `auth/login/password/`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username_or_email": "user123",
    "password": "yourpassword"
  }
  ```
- **Response**: Returns `access`, `refresh` tokens and `user` object.

### Google Login
- **URL**: `auth/google/`
- **Method**: `POST`
- **Body**: `{ "token": "<google_id_token>" }`

### Send OTP (Registration)
- **URL**: `auth/register/send-otp/`
- **Method**: `POST`
- **Body**: `{ "email": "user@example.com" }`

### Register (Password + OTP)
- **URL**: `auth/register/password/`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "user123",
    "email": "user@example.com",
    "password": "Password123!",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "1234567890",
    "gender": "male",
    "otp": "123456"
  }
  ```

---

## 3. Profile & User Management

### Current User Profile
- **URL**: `user/`
- **Method**: `GET` (Fetch), `PATCH` (Update)

### User Search
- **URL**: `users/search/?q=<query>`
- **Method**: `GET`

### Follow/Unfollow Toggle
- **URL**: `users/<user_id>/follow/`
- **Method**: `POST`
- **Returns**: `{"status": "followed"|"unfollowed"|"request_sent"|"request_cancelled"}`

### Follow Requests (For Private Accounts)
- **List**: `GET /api/requests/`
- **Action**: `POST /api/requests/<request_id>/<action>/` (action: `accept` or `reject`)

---

## 4. Content (Posts, Twists, Stories, Reels)

### Posts (Main Feed)
- **URL**: `posts/`
- **Method**: `GET` (List feed), `POST` (Create)
- **Creation Body**: `Multipart/Form-Data` with `content`, `media_file`, `is_exclusive`, `required_tier`.

### Twists (Twitter-like)
- **URL**: `twists/`
- **Method**: `GET` (List), `POST` (Create)

### Reels (Short Videos)
- **URL**: `reels/`
- **Method**: `GET` (Random feed), `POST` (Create)

### Stories (24h)
- **List Feed**: `GET /api/stories/`
- **Create**: `POST /api/stories/`
- **Register View**: `POST /api/stories/<id>/view/`

---

## 5. Engagement

### Like Toggles
- **Post**: `POST /api/posts/<id>/like/`
- **Reel**: `POST /api/reels/<id>/like/`
- **Twist**: `POST /api/twists/<id>/like/`
- **Story**: `POST /api/stories/<id>/like/`

### Comments
- **List/Create**: `GET|POST /api/posts/<id>/comments/` (Same for Reels/Twists using their respective URLs)

---

## 6. Live Chat & Messaging

### Inbox
- **URL**: `chats/`
- **Method**: `GET` (Lists active conversations)

### Chat History
- **URL**: `chats/<user_id>/`
- **Method**: `GET`

### Send Message
- **URL**: `messages/send/`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "recipient_username": "target_user",
    "content": "Hello!",
    "story_id": null,
    "group_id": null
  }
  ```

---

## 7. Monetization (Subscriptions)

### Global Plans
- **URL**: `subscriptions/global-plans/`
- **Method**: `GET` (Lists Basic, Pro, Elite plans)

### Checkout
- **URL**: `subscriptions/checkout/`
- **Method**: `POST`
- **Body**: `{ "plan_tier": "pro", "creator_id": 1 }`
- **Response**: Stripe Checkout URL.

---

## 8. Real-time (WebSockets)

- **Notification Socket**: `ws://<server>/ws/notifications/`
- **Chat Socket**: `ws://<server>/ws/chat/<room_name>/`

---

## 9. Developer Tips for Android (Retrofit/Ktor)
1. **Multipart Requests**: Use `@Multipart` for uploading images/videos (Posts, Reels, Stories).
2. **Pagination**: The feed APIs use `PageNumberPagination`. Look for `next` and `previous` keys in responses.
3. **Token Refresh**: When the access token expires (401 error), call `token/refresh/` with the `refresh` token to get a new `access` token.
4. **WebSocket Library**: Use `OkHttp` or `Scarlet` for real-time chat and notification updates.
