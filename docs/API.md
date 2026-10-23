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
## Shared pet lifecycle

All mutations require the signed-in user's Bearer token. Actor IDs are derived from authentication, never request bodies.

| Endpoint | Body | Authorization and result |
| --- | --- | --- |
| `DELETE /api/pets/:id/membership` | none | Removes only the caller's association. A primary must transfer first. Repeated removal succeeds. |
| `DELETE /api/pets/:id/parents/:parentUserId` | none | Self, primary, or active member with `MANAGE_PARENTS`; never removes an active primary. |
| `POST /api/pets/:id/transfer-ownership` | `{ "userId": "recipient UUID" }` | Primary only; recipient must be an active existing member. |
| `DELETE /api/pets/:id` | none | Primary only. Soft-deletes pet, revokes every membership, retains posts/media. Retry by deleting primary succeeds during retention. |

Membership/ownership mutations serialize on the pet row. Errors: 401 unauthenticated, 403 unauthorized, 404 deleted/missing pet, 409 invalid lifecycle transition. Normal retrieval and media authorization return opaque 404 for deleted pets. Independent posts remain published with the deleted pet tag omitted; original associations remain during retention.

## Custom administrative roles

Existing `GET /api/admin/roles` now includes `assigned_count` (active and inactive assignments), permission definitions, and `is_system`. The existing admin create/update endpoints accept custom role IDs.

| Endpoint | Body | Permission |
| --- | --- | --- |
| `POST /api/admin/roles` | `{ "name": "Review team", "description": "Read only", "permissionIds": ["permission UUID"] }` | `roles.manage` |
| `PATCH /api/admin/roles/:id` | Same complete role definition; replaces mappings atomically | `roles.manage` |
| `DELETE /api/admin/roles/:id` | none | `roles.manage`; custom role must have no assignments |
| `PATCH /api/admin/admins/:id` | `{ "roleId": "role UUID", "isActive": true }` (either field optional) | `admins.update` |

Names are unique after trimming and case folding. Built-in roles are protected. Non-Super Admins cannot manage roles or administrators exceeding their own effective permissions, or grant `roles.manage`, `admins.create`, `admins.update`, or `system.manage`. Only a built-in Super Admin can grant these privileged scopes or manage Super Admin assignments. Self-assignment changes are denied and the last active Super Admin is protected. Failed authorization returns 403; invalid input returns 400; duplicate names return 409. Permissions reload on every authenticated request. Every successful governance mutation writes its audit entry in the same database transaction, including previous and new permission mappings.

### Retriable pet gallery attachments

`POST /api/pets/:id/media` also accepts optional `client_pet_media_id` (UUID).
Background clients persist this ID and the uploaded `media_id`. A matching repeat
returns the existing association; an ID used for a different pet, media item,
creator, or role returns 409. The uploaded media must belong to the caller when
using a request ID. Normal pet upload permission checks apply on every attempt.
No new database columns or tables are required for this idempotency key.

## Community deletion and ownership management

- `DELETE /api/communities/:id` requires authentication and body `{ "confirmation": "Exact current community name" }`. Only the database's current `owner_id` can delete. The request actor always comes from authentication; supplied owner/role fields are ignored. Success returns `{ "success": true }`; repeating the deletion as the deleting owner succeeds without duplicate audit entries. 401 means unauthenticated, 403 means not current owner, 404 means missing/deleted resource, and 400 means incorrect confirmation/invalid input.
- Deletion is now soft: the community receives `deleted_at`, `deleted_by`, `purge_after` and `is_archived=true`. Posts receive `community_deleted_at` to filter service-role feeds, search, profiles, reels and bookmarks. Membership rows and content are retained but inaccessible. Public UUID/slug URLs, nested resources and comments on retained community posts return not found. Database guards reject new descendant writes even when deletion races an in-flight request.
- Existing `PATCH /api/communities/:id/members/:userId/role` retains `moderator` and `member` and now also accepts `{ "role": "owner" }` for ownership transfer in this checkout. Only the current canonical owner may invoke it. Transfer requires an active existing, non-banned recipient, atomically updates `communities.owner_id` and membership roles, and leaves the previous owner as a regular member. Moderator promotion/demotion requires an active existing recipient; moderators cannot transfer or delete.
- These governance operations lock the community row and write `COMMUNITY_DELETED`, `COMMUNITY_OWNERSHIP_TRANSFERRED` or `COMMUNITY_ROLE_UPDATED` to existing `admin_audit_logs` in the same transaction. A community owner is recorded as `admin_user_id` with `admin_id` null; the log schema already permits this.

Web: community Settings/Moderation contains owner-only Delete Community; the member menu contains Transfer ownership alongside existing moderator controls. Mobile: Edit Community contains Delete Community; existing member menus expose the same transfer and moderator actions. Both deletion dialogs require the community name. Deletion returns to discovery and refreshes local state.
