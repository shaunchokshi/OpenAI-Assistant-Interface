# Database Schema Documentation

## Overview

This document describes the database schema used by the OpenAI Assistant application. The application uses a PostgreSQL database to store user information, assistants, chat threads, messages, and file metadata.

## Tables

### users

Stores user account information and preferences.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| email | VARCHAR(255) | User's email address (unique, required) |
| password | TEXT | Bcrypt hashed password |
| openai_key_hash | VARCHAR(255) | SHA-256 hash of the user's OpenAI API key |
| default_assistant_id | INTEGER | Foreign key to the user's default assistant |
| reset_at | TIMESTAMP | Timestamp of the last password reset |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### assistants

Stores assistant configuration per user.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users table (required) |
| name | VARCHAR(100) | Assistant name (required) |
| description | TEXT | Description of the assistant's purpose |
| openai_assistant_id | VARCHAR(100) | OpenAI platform assistant ID |
| model | VARCHAR(50) | LLM model used (default: "gpt-4o") |
| instructions | TEXT | System instructions/prompt for the assistant |
| temperature | DOUBLE PRECISION | Temperature setting (0.0-1.0, default: 0.7) |
| file_ids | TEXT[] | Array of OpenAI file IDs attached to the assistant |
| tools | JSONB | JSON configuration of tools enabled for the assistant |
| is_active | BOOLEAN | Whether the assistant is active (default: true) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Constraints:**
- UNIQUE(user_id, name) - Prevents duplicate assistant names per user

### threads

Stores conversation threads.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users table (required) |
| assistant_id | INTEGER | Foreign key to assistants table (nullable) |
| openai_thread_id | VARCHAR(100) | OpenAI platform thread ID (required) |
| title | VARCHAR(255) | Thread title (default: "New Thread") |
| is_archived | BOOLEAN | Whether the thread is archived (default: false) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### messages

Stores individual messages within threads.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| thread_id | INTEGER | Foreign key to threads table (required) |
| role | VARCHAR(20) | Message role (e.g., "user", "assistant") |
| content | TEXT | Message content (required) |
| openai_message_id | VARCHAR(100) | OpenAI platform message ID |
| created_at | TIMESTAMP | Creation timestamp |

### files

Stores metadata about uploaded files.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users table (required) |
| assistant_id | INTEGER | Foreign key to assistants table (nullable) |
| openai_file_id | VARCHAR(100) | OpenAI platform file ID (required) |
| filename | VARCHAR(255) | Original filename (required) |
| purpose | VARCHAR(50) | File purpose (e.g., "assistants") |
| bytes | INTEGER | File size in bytes |
| created_at | TIMESTAMP | Creation timestamp |

### oauth_profiles

Stores OAuth provider connections.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | INTEGER | Foreign key to users table (required) |
| provider | VARCHAR(50) | OAuth provider name (e.g., "github", "google") |
| provider_user_id | VARCHAR(255) | User ID from the provider |
| access_token | TEXT | OAuth access token |
| refresh_token | TEXT | OAuth refresh token |
| created_at | TIMESTAMP | Creation timestamp |

### session

Stores user sessions.

| Column | Type | Description |
|--------|------|-------------|
| sid | VARCHAR(255) | Session ID (primary key) |
| sess | TEXT | Session data |
| expire | TIMESTAMP | Expiration timestamp |

## Indexes

The following indexes are created for performance optimization:

- idx_assistants_user_id - Index on assistants(user_id)
- idx_threads_user_id - Index on threads(user_id)
- idx_threads_assistant_id - Index on threads(assistant_id)
- idx_messages_thread_id - Index on messages(thread_id)
- idx_files_user_id - Index on files(user_id)
- idx_files_assistant_id - Index on files(assistant_id)

## Relationships

1. users - assistants: One-to-many (a user can have multiple assistants)
2. users - threads: One-to-many (a user can have multiple conversation threads)
3. assistants - threads: One-to-many (an assistant can be used in multiple threads)
4. threads - messages: One-to-many (a thread contains multiple messages)
5. users - files: One-to-many (a user can upload multiple files)
6. assistants - files: One-to-many (an assistant can have multiple files attached)
7. users - oauth_profiles: One-to-many (a user can connect multiple OAuth providers)

## Cascading Deletions

1. When a user is deleted, all their assistants, threads, messages, files, and OAuth profiles are deleted.
2. When an assistant is deleted, associated threads will have their assistant_id set to NULL.
3. When a thread is deleted, all its messages are deleted.