-- Create `roles` table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Seed roles 
INSERT INTO roles (name) VALUES
('Super Admin'),
('Client Admin'),
('Data Analyst'),
('Research Lead'),
('Field Supervisor'),
('Data Collection Assistant'),
('Dashboard Developer')
ON CONFLICT (name) DO NOTHING;

-- Create `users` table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role_id INTEGER REFERENCES roles(id),
  is_active BOOLEAN DEFAULT TRUE,
  is_logged_in BOOLEAN DEFAULT FALSE,  -- ✅ Added
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure `is_logged_in` exists for older DBs
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_logged_in BOOLEAN DEFAULT FALSE;

-- OTPs table for registration / forgot-password
CREATE TABLE IF NOT EXISTS otps (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


-- Sessions table for express-session
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire);