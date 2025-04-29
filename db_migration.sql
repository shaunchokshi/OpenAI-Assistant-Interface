-- Rename existing columns to maintain data
ALTER TABLE users RENAME COLUMN api_key_hash TO openai_key_hash;
ALTER TABLE users RENAME COLUMN assistant_id TO default_assistant_id;
ALTER TABLE users ALTER COLUMN default_assistant_id TYPE INTEGER USING default_assistant_id::INTEGER;

-- Create new tables
CREATE TABLE IF NOT EXISTS assistants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  openai_assistant_id VARCHAR(100),
  model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o',
  instructions TEXT,
  temperature DOUBLE PRECISION DEFAULT 0.7,
  file_ids TEXT[],
  tools JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS threads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assistant_id INTEGER REFERENCES assistants(id) ON DELETE SET NULL,
  openai_thread_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) DEFAULT 'New Thread',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  openai_message_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assistant_id INTEGER REFERENCES assistants(id) ON DELETE SET NULL,
  openai_file_id VARCHAR(100) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  bytes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assistants_user_id ON assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_assistant_id ON threads(assistant_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_assistant_id ON files(assistant_id);