# Trend Twist

Trend Twist is a comprehensive, full-stack social media and creator monetization platform. It combines the best features of popular social media applications like Instagram (Posts, Reels, Stories) and Twitter (Twists/Text posts), while offering built-in monetization capabilities similar to Patreon or OnlyFans. The platform leverages modern web technologies to deliver real-time communication, WebRTC video calling, secure payments, and a seamless user experience.

---

## 🚀 Key Functionalities

### 1. User Authentication & Profiles
*   **Multiple Login Methods:** Users can sign up and log in using Traditional Email/Password or **Google OAuth** for quick access. 
*   **OTP Verification:** Secure password resets and account verification using One-Time Passwords (OTPs) sent via email.
*   **Profile Customization:** Users can update bios, profile pictures, and links.
*   **Privacy & Creator Modes:** Accounts can be set to **Private** (requiring follow requests). Users can also toggle **Creator Mode** to monetize their content.

### 2. Rich Content Ecosystem
*   **Posts:** Standard image or text posts with captions.
*   **Reels (Short-form Video):** A TikTok/Instagram Reels clone. Users can upload videos, attach music, and track view counts.
*   **Stories:** 24-hour ephemeral content. Supports images, videos, and background music.
*   **Twists:** Short, text-first content similar to Twitter (X). Supports "Retwists" and quoting other content.
*   **Engagement:** Every content type supports Likes, Comments, and Sharing.
*   **Advanced Editor:** Built-in editor using `fabric.js` to create customized media content.

### 3. Monetization & Subscriptions
*   **Tiered Subscriptions:** Creators can gate their content (Posts, Reels, Twists, Stories) behind subscription tiers (Basic, Pro, Elite).
*   **Payment Gateway:** Integrated with **Stripe** to handle global subscription payments securely.
*   **Revenue Split & Payouts:** The platform automatically splits earnings (e.g., 80% to Creator, 20% to Admin). Creators can request withdrawals via Bank Transfer or UPI.

### 4. Real-time Communication
*   **Live Direct Messaging (DM):** 1-on-1 private chat in real-time.
*   **Group Chats:** Multi-user chat rooms.
*   **Stranger Talk (Random Matchmaking):** An Omegle-like feature that connects random active users for real-time video and audio chats using **WebRTC** and WebSockets.
*   **Live Notifications:** Real-time push alerts for likes, comments, follows, and messages.

### 5. Admin Panel & Moderation
*   **Dashboard:** Built with `recharts` for visualizing user growth, revenue, and active reports.
*   **Content Moderation:** Admins can view user reports and delete violating Posts, Reels, or Twists.
*   **User Management:** Admins have the authority to block malicious users and handle payout requests from creators.

---

## 🛠️ Technology Stack & Architecture

### Frontend (Client-side)
*   **React (Vite):** A fast and modern JavaScript library for building user interfaces.
*   **Tailwind CSS:** A utility-first CSS framework for highly responsive and modern styling.
*   **Framer Motion:** Used for smooth micro-animations and page transitions to give the app a premium feel.
*   **React Router:** For client-side routing and Single Page Application (SPA) navigation.
*   **Axios:** For making asynchronous HTTP requests to the backend REST APIs.
*   **Socket.IO-client / WebSocket API:** For maintaining persistent connections to the server for live chat and notifications.
*   **Fabric.js:** An HTML5 canvas library utilized for the rich media editor (text overlays, drawing) in Stories and Reels.
*   **React Howler:** To handle audio playback for background music in stories and reels.

### Backend (Server-side)
*   **Django & Django REST Framework (DRF):** A high-level Python web framework used for writing the core business logic, database models, and RESTful APIs.
*   **Django Channels:** Extends Django to handle WebSockets asynchronously, powering the real-time chat, notifications, and Stranger Talk signaling.
*   **PostgreSQL:** Advanced relational database system used to store users, content, and transactions securely.
*   **Redis:** Serves as the message broker and backing store for Django Channels to route WebSocket messages between distributed users.

### Cloud & DevOps Services
*   **AWS S3 / Cloud Storage:** (via `django-storages` and `boto3`) Used to securely store user-uploaded media (Images, Videos, Audio) rather than storing them on the local server.
*   **Stripe API:** Handles complex recurring billing, checkout sessions, and webhook verifications for Creator Subscriptions.
*   **WebRTC:** Peer-to-peer browser technology used for the "Stranger Talk" live video calling functionality (signaled via Django Channels).

---

## 🧠 Detailed Explanation: How Methods Work

### 1. REST APIs vs WebSockets
*   **Stateless Operations (REST):** When a user scrolls their feed, searches for a hashtag, or updates their profile, the React frontend makes a standard HTTP GET/POST/PUT request using `Axios` to a specific Django URL (e.g., `/api/posts/`). Django processes it, queries the PostgreSQL database, and returns JSON data.
*   **Stateful Operations (WebSockets):** For the Chat and Notifications, traditional HTTP is too slow. The app opens a persistent `ws://` or `wss://` connection to the unified backend routing via **Django Channels**. As soon as User A sends a message, Django routes it to a **Redis channel** that User B is listening to, causing User B's screen to update instantly without refreshing.

### 2. Audio/Video Matchmaking (Stranger Talk)
*   **Signaling:** When a user enters "Stranger Talk", the frontend connects to a specific Django WebSocket consumer (`StrangerConsumer`).
*   **Matchmaking:** The server places the user in a waiting pool. When two users are in the pool, the server pairs them.
*   **WebRTC Peer Connection:** The server does *not* stream the video itself to save bandwidth. Instead, it acts as a "Signaler", sharing the users' IP addresses and connection capabilities (SDP offers/answers and ICE candidates). Once exchanged, the two browsers connect directly to each other peer-to-peer via **WebRTC** to stream video and audio.

### 3. Stripe Subscription Flow
1. User clicks "Subscribe" on a Creator's profile.
2. React sends a request to Django, which calls Stripe's API to generate a temporary `Checkout Session URL`.
3. The user is securely redirected to Stripe to enter their credit card.
4. Upon success, Stripe sends a background server-to-server **Webhook** to Django (`/api/subscriptions/webhook/`).
5. Django mathematically calculates the 80/20 revenue split, creates a `CreatorEarning` record, changes the user's access status to the gated content, and sends a real-time notification to the Creator.

### 4. JWT Authentication
*   Instead of storing login sessions on the server filesystem, the app uses **JSON Web Tokens (JWT)**.
*   Upon login, Django gives React an `access_token` and a `refresh_token`.
*   React attaches the `access_token` to the header of every future API request. The backend decrypts this token to securely identify the user without querying the database heavily for session lookups.

### 5. Advanced Media Handling
*   When a user creates a Story, they might draw on the image. The frontend uses `Fabric.js` to track the brush strokes and text as a JSON object (`editor_json`).
*   When viewing, this JSON is reconstructed, or alternatively, the canvas is exported to a flat image file. Background music is uploaded alongside the image and played concurrently using `React Howler` to synchronize the experience over an assigned timestamp duration limit (e.g., 15 seconds).
