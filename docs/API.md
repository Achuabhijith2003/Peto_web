# Peto Backend API Documentation

Version: 1.1.0

---

# Base URL

Development

```
http://localhost:5000/api
```

Production

```
https://api.peto.com/api
```

---

# Authentication

Peto uses **Supabase Authentication**.

Frontend authenticates with Supabase and sends the Access Token to every protected endpoint.

Header

```http
Authorization: Bearer <access_token>
```

Protected endpoints require this header.

---

# Response Format

## Success

```json
{
    "success": true,
    "data": {}
}
```

## Error

```json
{
    "success": false,
    "message": "Error message"
}
```

## Validation Error

```json
{
    "success": false,
    "errors": []
}
```

---

# Health

## GET /health

Server health check.

---

# API

## GET /

Returns API information.

---

# Authentication

## POST /auth/signup

Register a new user.

Body

```json
{
    "email":"john@gmail.com",
    "password":"Password@123",
    "fullName":"John Doe"
}
```

---

## POST /auth/login

Login user.

Body

```json
{
    "email":"john@gmail.com",
    "password":"Password@123"
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

## GET /users/me

Returns logged in user's profile.

Authorization Required

---

## GET /users/:id

Get public profile.

Authorization Required

---

## PATCH /users/me

Update profile.

Body

```json
{
    "fullName":"John Doe",
    "username":"john_doe",
    "bio":"Pet Lover",
    "website":"https://example.com",
    "location":"India"
}
```

Authorization Required

---

## PATCH /users/avatar

Upload avatar.

Content-Type

```
multipart/form-data
```

Field

```
avatar
```

Authorization Required

---

## PATCH /users/cover

Upload cover image.

Content-Type

```
multipart/form-data
```

Field

```
cover
```

Authorization Required

---

## DELETE /users/me

Delete account.

Authorization Required

---

## GET /users/search

Search users.

Example

```
/users/search?q=john&page=1&limit=20
```

---

## GET /users/check-username

Example

```
/users/check-username?username=john_doe
```

Response

```json
{
    "available": true
}
```

---

# Pets

## POST /pets

Create pet profile.

---

## GET /pets

Get current user's pets.

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

Supports

- Text
- Images
- Videos
- Multiple media

---

## GET /posts

Feed

Supports pagination

```
?page=1&limit=20
```

---

## GET /posts/:id

Get post.

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

Like content.

---

## DELETE /likes/:id

Remove like.

---

# Bookmarks

## POST /bookmarks

Bookmark post.

---

## DELETE /bookmarks/:id

Remove bookmark.

---

# Followers

## POST /follow/:userId

Follow user.

---

## DELETE /follow/:userId

Unfollow user.

---

## GET /followers

Get followers.

---

## GET /following

Get following.

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

## PATCH /communities/:id

Update community.

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

Conversation.

---

## POST /messages

Send message.

---

# Notifications

## GET /notifications

Get notifications.

---

## PATCH /notifications/read

Mark notifications as read.

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

## DELETE /media/:id

Delete uploaded media.

---

# Search

## GET /search

Example

```
/search?q=golden retriever
```

Searches

- Users
- Pets
- Posts
- Communities

---

# AI

## POST /ai/chat

AI Chat.

---

## POST /ai/analyze-pet

Pet image analysis.

---

## POST /ai/caption

Generate captions.

---

# Reports

## POST /reports

Report

- User
- Post
- Comment
- Community

---

# Admin

## GET /admin/users

List users.

---

## PATCH /admin/users/:id

Update user.

---

## DELETE /admin/users/:id

Delete user.

---

## GET /admin/reports

Reported content.

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

# API Development Roadmap

- ✅ Foundation
- ✅ Authentication
- ✅ User Profile
- ⏳ Media Upload
- ⏳ Pets
- ⏳ Posts
- ⏳ Comments
- ⏳ Likes
- ⏳ Bookmarks
- ⏳ Follow System
- ⏳ Communities
- ⏳ Notifications
- ⏳ Chat
- ⏳ Search
- ⏳ AI
- ⏳ Admin