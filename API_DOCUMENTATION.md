# OpenAI Assistant API Documentation

## Overview

This API provides endpoints for interacting with OpenAI's Assistant API. Each user can set up their own OpenAI API key and create custom assistants tailored to their specific needs.

## Authentication

All API endpoints (except for login/register) require authentication. Authentication is handled via session cookies, which are automatically managed by the browser.

- `POST /api/register` - Register a new user
- `POST /api/login` - Login an existing user
- `POST /api/logout` - Logout the current user
- `GET /api/user` - Get the current user's information

## User Settings

### API Key Management

```
POST /api/settings/apikey
```

Set the user's OpenAI API key for use with all Assistant operations. The API key is securely hashed before storage and never exposed in responses.

**Request Body:**
```json
{
  "apiKey": "sk-your-openai-api-key"
}
```

**Response:**
```json
{
  "message": "API key updated successfully"
}
```

### Default Assistant Management

```
POST /api/settings/default-assistant
```

Set the user's default assistant which will be used for conversations if no specific assistant is specified.

**Request Body:**
```json
{
  "assistantId": 123
}
```

To clear the default assistant:
```json
{
  "assistantId": null
}
```

**Response:**
```json
{
  "message": "Default assistant updated successfully"
}
```

## Assistants

### List Assistants

```
GET /api/assistants
```

Get all assistants belonging to the authenticated user.

**Response:**
```json
[
  {
    "id": 1,
    "userId": 42,
    "name": "My Research Assistant",
    "description": "Helps with academic research",
    "openaiAssistantId": "asst_abc123",
    "model": "gpt-4o",
    "instructions": "You are a helpful research assistant...",
    "temperature": 0.7,
    "fileIds": ["file-abc123", "file-def456"],
    "tools": [{"type": "retrieval"}],
    "isActive": true,
    "createdAt": "2025-04-29T20:10:30.123Z",
    "updatedAt": "2025-04-29T20:10:30.123Z"
  }
]
```

### Get Assistant

```
GET /api/assistants/:id
```

Get a specific assistant by ID.

**Response:**
Same format as an individual assistant from the list endpoint.

### Create Assistant

```
POST /api/assistants
```

Create a new assistant.

**Request Body:**
```json
{
  "name": "My Coding Assistant",
  "description": "Helps with programming tasks",
  "model": "gpt-4o",
  "instructions": "You are a coding assistant specializing in JavaScript...",
  "temperature": 0.5,
  "tools": [{"type": "retrieval"}]
}
```

**Response:**
```json
{
  "id": 2,
  "userId": 42,
  "name": "My Coding Assistant",
  "description": "Helps with programming tasks",
  "openaiAssistantId": null,  // Will be populated when first used
  "model": "gpt-4o",
  "instructions": "You are a coding assistant specializing in JavaScript...",
  "temperature": 0.5,
  "fileIds": [],
  "tools": [{"type": "retrieval"}],
  "isActive": true,
  "createdAt": "2025-04-29T20:15:45.678Z",
  "updatedAt": "2025-04-29T20:15:45.678Z"
}
```

### Update Assistant

```
PATCH /api/assistants/:id
```

Update an existing assistant. All fields are optional.

**Request Body:**
```json
{
  "name": "Updated Assistant Name",
  "temperature": 0.8
}
```

**Response:**
The updated assistant object.

### Delete Assistant

```
DELETE /api/assistants/:id
```

Delete an assistant.

**Response:**
```json
{
  "message": "Assistant deleted successfully"
}
```

## Threads and Chat

### List Threads

```
GET /api/threads
```

Get all chat threads belonging to the authenticated user.

**Response:**
```json
[
  {
    "id": 1,
    "userId": 42,
    "assistantId": 1,
    "openaiThreadId": "thread_abc123",
    "title": "Research Discussion",
    "isArchived": false,
    "createdAt": "2025-04-29T21:10:30.123Z",
    "updatedAt": "2025-04-29T21:20:45.678Z"
  }
]
```

### Get Thread Messages

```
GET /api/threads/:id/messages
```

Get all messages in a specific thread.

**Response:**
```json
[
  {
    "id": 1,
    "threadId": 1,
    "role": "user",
    "content": "Can you help me research quantum computing?",
    "openaiMessageId": "msg_abc123",
    "createdAt": "2025-04-29T21:10:35.123Z"
  },
  {
    "id": 2,
    "threadId": 1,
    "role": "assistant",
    "content": "I'd be happy to help with your quantum computing research...",
    "openaiMessageId": "msg_def456",
    "createdAt": "2025-04-29T21:10:40.456Z"
  }
]
```

### Update Thread

```
PATCH /api/threads/:id
```

Update a thread, currently only supports changing the title.

**Request Body:**
```json
{
  "title": "Updated Thread Title"
}
```

**Response:**
```json
{
  "message": "Thread updated successfully"
}
```

### Delete Thread

```
DELETE /api/threads/:id
```

Delete a thread and all its messages.

**Response:**
```json
{
  "message": "Thread deleted successfully"
}
```

### Create New Thread

```
POST /api/thread/new
```

Create a new conversation thread.

**Request Body:**
```json
{
  "title": "New Conversation",
  "assistantId": 1  // Optional, will use default assistant if not provided
}
```

**Response:**
```json
{
  "id": 2,
  "openaiThreadId": "thread_xyz789",
  "title": "New Conversation"
}
```

### Send Message to Thread

```
POST /api/chat
```

Send a message to a thread and get the assistant's response.

**Request Body:**
```json
{
  "threadId": 2,
  "message": "Hello! Can you help me with a programming question?"
}
```

**Response:**
```json
{
  "threadId": 2,
  "content": [
    {
      "type": "text",
      "text": "I'd be happy to help with your programming question. What would you like to know?"
    }
  ]
}
```

## File Management

### Upload File

```
POST /api/upload
```

Upload a file to be used with an assistant.

**Request Body:**
Multipart form data containing:
- `file`: The file to upload
- `assistantId`: (Optional) The ID of the assistant to associate with this file

**Response:**
```json
{
  "assistantId": 1,
  "fileIds": ["file-abc123", "file-def456", "file-new789"],
  "message": "Successfully uploaded 1 file(s)"
}
```

### Upload Directory

```
POST /api/upload-directory
```

Upload multiple files from a directory.

**Request Body:**
```json
{
  "dir": "./documentation",
  "assistantId": 1
}
```

**Response:**
```json
{
  "assistantId": 1,
  "fileIds": ["file-abc123", "file-def456", "file-ghi789", "file-jkl012"],
  "message": "Successfully uploaded 2 file(s)"
}
```

## Error Responses

All endpoints return appropriate HTTP status codes:

- `400 Bad Request` - Invalid input, missing required fields, or validation errors
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized to access the requested resource
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

Error responses follow this format:

```json
{
  "error": "Error message",
  "details": [...] // Optional additional details
}
```