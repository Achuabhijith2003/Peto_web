# Peto Backend API Documentation

Version: 1.0.0

Base URL

```
http://localhost:5000/api
```

Production

```
https://api.peto.com/api
```

---

# Authentication

Authentication is handled using **Supabase Auth**.

The frontend authenticates with Supabase and sends the JWT Access Token to the backend.

Header

```http
Authorization: Bearer <access_token>
```

---

# Health Check

## GET /health

Check server status.

### Response

```json
{
    "success": true,
    "status": "OK"
}
```

---

# API Status

## GET /api

Returns API information.

Response

```json
{
    "name": "Peto API",
    "version": "1.0.0",
    "status": "Running"
}
```

---

# Authentication

## POST /auth/signup

Register a new user.

### Body

```json
{
    "email":"john@gmail.com",
    "password":"Password@123",
    "fullName":"John Doe"
}
```

### Success

```json
{
    "success":true,
    "user":{},
    "session":{}
}
```

---

## POST /auth/login

Login user.

### Body

```json
{
    "email":"john@gmail.com",
    "password":"Password@123"
}
```

### Success

```json
{
    "success":true,
    "user":{},
    "session":{}
}
```

---

## POST /auth/logout

Logout current user.

Authorization Required

---

## GET /auth/me

Returns authenticated user.

Authorization Required

---

# Users

## GET /users/:id

Get user profile.

Authorization Required

---

## PATCH /users/:id

Update profile.

Authorization Required

Body

```json
{
    "fullName":"John Doe",
    "bio":"Pet Lover",
    "location":"India"
}
```

---

## PATCH /users/avatar

Upload avatar.

Authorization Required

Content-Type

```
multipart/form-data
```

---

# Pets

## POST /pets

Create pet profile.

Authorization Required

---

## GET /pets

Get user's pets.

---

## GET /pets/:id

Get pet details.

---

## PATCH /pets/:id

Update pet.

---

## DELETE /pets/:id

Delete pet.

---

# Posts

## POST /posts

Create post.

Authorization Required

---

## GET /posts

News Feed.

Pagination

```
?page=1

&limit=20
```

---

## GET /posts/:id

Get single post.

---

## PATCH /posts/:id

Edit post.

---

## DELETE /posts/:id

Delete post.

---

# Comments

## POST /comments

Create comment.

---

## GET /comments/:postId

Get comments.

---

## DELETE /comments/:id

Delete comment.

---

# Likes

## POST /likes

Like post.

---

## DELETE /likes/:postId

Unlike post.

---

# Bookmarks

## POST /bookmarks

Bookmark post.

---

## DELETE /bookmarks/:postId

Remove bookmark.

---

# Followers

## POST /follow/:userId

Follow user.

---

## DELETE /follow/:userId

Unfollow user.

---

# Communities

## POST /communities

Create community.

---

## GET /communities

Community list.

---

## GET /communities/:id

Community details.

---

## POST /communities/:id/join

Join community.

---

## DELETE /communities/:id/leave

Leave community.

---

# Messages

## GET /messages

Conversation list.

---

## GET /messages/:userId

Chat messages.

---

## POST /messages

Send message.

---

# Notifications

## GET /notifications

Get notifications.

---

## PATCH /notifications/read

Mark as read.

---

# Media

## POST /media/image

Upload image.

Content-Type

```
multipart/form-data
```

Returns

```json
{
    "url":"",
    "thumbnail":"",
    "medium":"",
    "large":""
}
```

---

## POST /media/video

Upload video.

Returns

```json
{
    "videoUrl":"",
    "thumbnail":"",
    "duration":0
}
```

---

# Search

## GET /search

Query

```
?q=golden retriever
```

Returns

Users

Posts

Communities

Pets

---

# AI

## POST /ai/chat

Chat with AI assistant.

---

## POST /ai/analyze-pet

Analyze pet image.

---

# Reports

## POST /reports

Report post/user/community.

---

# Admin

## GET /admin/users

Admin only.

---

## DELETE /admin/user/:id

Admin only.

---

# Response Format

Success

```json
{
    "success":true,
    "data":{}
}
```

Error

```json
{
    "success":false,
    "message":"Error message"
}
```

Validation Error

```json
{
    "success":false,
    "errors":[]
}
```

---

# HTTP Status Codes

| Code | Description |
|------|-------------|
|200|OK|
|201|Created|
|204|No Content|
|400|Bad Request|
|401|Unauthorized|
|403|Forbidden|
|404|Not Found|
|409|Conflict|
|422|Validation Error|
|429|Too Many Requests|
|500|Internal Server Error|

---

# Future APIs

- Stories
- Reels
- Live Streaming
- Voice Chat
- Marketplace
- Pet Adoption
- Veterinary Booking
- AI Recommendation Engine
- AI Pet Health Detection
- Push Notifications
- Analytics
- Premium Subscription
- Payments
- Moderation System