# Trend Twist Backend API Documentation

Welcome to the backend server for **Trend Twist**, a comprehensive social media platform backend designed to support a feature-rich React Native Android application.

## 🚀 Overview for Android React Native Developers

This server is built using **Django 5.0**, **Django REST Framework (DRF)**, and **Django Channels** (for WebSocket-based features like chat).

**Key considerations for Android Emulator development:**
- When running this server locally `http://localhost:8000/`, your Android emulator cannot access it via `localhost`.
- You MUST use `http://10.0.2.2:8000/api/` as your base URL in your React Native app when running on an Android Virtual Device (AVD).
- If testing on a physical Android device, connect both your laptop and phone to the same Wi-Fi and use your local IPv4 address (e.g., `http://192.168.1.X:8000/api/`).

### 📦 Tech Stack
- **Frameworks**: Django, Django REST Framework
- **Authentication**: JWT (JSON Web Tokens), Google OAuth, OTP based login/registration
- **Real-time (WebSockets)**: Django Channels + Daphne/uvicorn (for Live Chat messages)
- **Database**: SQLite (default for development), PostgreSQL support included
- **File Handling**: Local media serving with `Pillow` (for images and reels processing)

---

## 🔑 Authentication Flow

All protected API endpoints require an `Authorization` header with a valid Bearer token.
`Authorization: Bearer <your_access_token>`

- **`POST /api/auth/register/request-otp/`**: Send email to request registration OTP.
- **`POST /api/auth/register/verify-only-otp/`**: Verify the emailed OTP.
- **`POST /api/auth/register/complete/`**: Finish user registration with details.
- **`POST /api/auth/login/request-otp/`**: Request OTP for an existing user login.
- **`POST /api/auth/login/verify-otp/`**: Verify Login OTP to get JWT access & refresh tokens.
- **`POST /api/auth/google/`**: Login/Register via Google OAuth.
- **`POST /api/token/`**: Direct Username/Password login (primarily for Admin access).
- **`POST /api/token/refresh/`**: Exchange a valid refresh token for a new access token.

---

## 📡 Core API Modules

Here is a full list of APIs and how they work grouped by features. The base path for all endpoints is `/api/`.

### 1. User & Profiles
Provides user discovery and profile management.
- **`GET /api/user/`**: Current logged-in user's profile details.
- **`PUT/PATCH /api/profile/update/`**: Update bio, avatar, online status, or toggle private account.
- **`GET /api/profiles/<username>/`**: Fetch another user's public profile.
- **`GET /api/users/<user_id>/posts/`**: Fetch posts by a specific user.
- **`GET /api/users/search/`**: Real-time user search functionality.

### 2. Follow & Privacy Requests
Handles relationships, including public "Following" and private "Follow Requests."
- **`POST /api/users/<pk>/follow/`**: Toggle follow/unfollow a user. If the user is `is_private=True`, it generates a `FollowRequest` instead of instantly following.
- **`GET /api/profiles/<username>/followers/`**: List followers.
- **`GET /api/profiles/<username>/following/`**: List followings.
- **`GET /api/requests/`**: See incoming follow requests (Pending).
- **`POST /api/requests/<pk>/<action>/`**: Action can be `accept` or `reject` for a private account follow request.

### 3. Messaging & Live Chat
Direct Mentions and Group chats. Real-time updates utilize WebSockets (via Django Channels). Expect WebSocket paths to be documented separately depending on routing configs (e.g., `ws://10.0.2.2:8000/ws/chat/<room_id>/`).
- **`GET /api/chats/`**: Get the inbox list containing direct message ChatRooms.
- **`GET /api/chats/<user_id>/`**: Fetch chat history and enter a direct chat room with a specific user.
- **`GET /api/groups/`**: Get list of Group Chats user is part of.
- **`GET /api/groups/<pk>/`**: Get details of a specific Group.
- **`GET /api/groups/<pk>/messages/`**: Read chat history for a group.

### 4. Content (Posts)
Standard Image/Video/Text posts.
- **`GET, POST /api/posts/`**: List the logged-in user's feed or Create a new post. (Supports Multipart Form Data for `media_file`).
- **`GET /api/posts/public/`**: Public post feed (Explore page).
- **`GET, DELETE /api/posts/<pk>/`**: Detail, view, or delete specific post.
- **`POST /api/posts/<pk>/like/`**: Toggle Like.
- **`GET, POST /api/posts/<pk>/comments/`**: Fetch or create comments on a post.
- **`POST /api/posts/<pk>/share/`**: Share a post.

### 5. Content (Twists)
Text-first, Twitter-like posts, including Quote Posts and Re-Twists.
- **`GET, POST /api/twists/`**: Standalone Twist feed / Create a Twist.
- **`GET /api/twists/public/`**: Public twists feed.
- **`GET, DELETE /api/twists/<pk>/`**: View or delete specific twist.
- **`POST /api/twists/<pk>/like/`**: Like a twist.
- **`GET, POST /api/twists/<pk>/comments/`**: Comment on a twist.
- **`POST /api/twists/<pk>/share/`**: Share or Re-twist.
- **`GET /api/users/<user_id>/twists/`**: Get a user's twist timeline.

### 6. Stories
Ephemeral content (expires in 24 hours), supports music and editor states.
- **`GET, POST /api/stories/`**: Create or view feed of active stories.
- **`GET /api/stories/user/<user_id>/`**: View all active stories by a specific user.
- **`POST /api/stories/<story_id>/view/`**: Register a story view (marks as watched).
- **`POST /api/stories/<pk>/like/`**: Like a story.
- **`GET /api/stories/<story_id>/analytics/`**: See who viewed or liked your story.

### 7. Reels (Short-form Videos)
Instagram-like short scrolling videos.
- **`GET, POST /api/reels/`**: Create reel or load main Reels feed.
- **`GET /api/reels/user/<user_id>/`**: Load reels by user profile.
- **`GET /api/reels/<pk>/`**: Reel Details.
- **`POST /api/reels/<pk>/like/`**: Like a reel.
- **`GET, POST /api/reels/<pk>/comments/`**: Interact via comments on a reel.
- **`POST /api/reels/<pk>/view/`**: Register a view count for a Reel.

### 8. Notifications & Reports
- **`GET /api/notifications/`**: List your notifications (Likes, Comments, Follows, etc.).
- **`POST /api/notifications/<pk>/<action>/`**: Mark as read, accept follow requests from notification, etc.
- **`POST /api/reports/`**: Report inappropriate posts, users, reels, or twists.

### 9. Admin Dashboard
Administrative APIs (Require staff/superuser tokens).
- **`GET /api/admin/dashboard/`**: App-wide stats (users, posts, reports).
- **`GET /api/admin/users/`**: List all users.
- **`POST /api/admin/users/<user_id>/block/`**: Ban/block a user.
- **`POST /api/admin/posts/<post_id>/`**, **`api/admin/reels/...`**: Administrative actions (like forced deletion) on content or reports.

---

## 🛠️ Data Handling Guidelines for React Native

### JSON vs. FormData
- For basic actions (e.g., Liking, commenting, OTP verification), send standard `application/json`.
- When uploading **Media** (Posts, Stories, Reels, Avatar updates), you MUST use `multipart/form-data` via React Native's `FormData` API.
  
```javascript
const formData = new FormData();
formData.append('content', 'My new post description!');
formData.append('media_file', {
  uri: 'file://path/to/image.jpg', // Path obtained from ImagePicker
  type: 'image/jpeg',
  name: 'upload.jpg',
});

fetch('http://10.0.2.2:8000/api/posts/', {
    method: 'POST',
    body: formData,
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'multipart/form-data', // Usually fetch infers this
    },
})
```

### Media URLs
Media files served from Django will be returned with relative paths (e.g., `/media/profiles/avatar.png`). In React Native, be sure to prepend your base server URL to `Image` components so they load correctly!

```javascript
<Image source={{ uri: `http://10.0.2.2:8000${user.profile_picture}` }} />
```

---

## ▶️ Setup Instructions

To get the server running locally to test your app:

1. **Navigate to the server directory**:
   ```bash
   cd server
   ```

2. **Activate your Python environment (Optional but Recommended)**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run Migrations**:
   *(Make sure your database is updated to the latest schema)*
   ```bash
   python manage.py migrate
   ```

5. **Run the Development Server**:
   ```bash
   python manage.py runserver
   ```
   *The server is now live at `http://localhost:8000/`*
