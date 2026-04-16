-- ═══════════════════════════════════════════════════════════
-- PC PHONE - SUPABASE DATABASE SETUP
-- ═══════════════════════════════════════════════════════════
-- 
-- INSTRUCTIONS:
-- 1. Go to https://zvermhsaarqxfpatwqed.supabase.co
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste the code below
-- 5. Click "Run" button
-- 6. Wait for all queries to complete successfully
-- ═══════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────
-- 1. USERS TABLE
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone);


-- ─────────────────────────────────────────────────────────
-- 2. CONTACTS TABLE
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts(user_id);


-- ─────────────────────────────────────────────────────────
-- 3. CALL HISTORY TABLE
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  number VARCHAR(15) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('in', 'out', 'missed')),
  duration INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS call_history_user_id_idx ON call_history(user_id);
CREATE INDEX IF NOT EXISTS call_history_timestamp_idx ON call_history(timestamp);


-- ─────────────────────────────────────────────────────────
-- 4. INCOMING CALLS TABLE (for notifications)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incoming_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_phone VARCHAR(15) NOT NULL,
  from_phone VARCHAR(15) NOT NULL,
  call_type VARCHAR(10) NOT NULL CHECK (call_type IN ('audio', 'video')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'missed')),
  created_at TIMESTAMP DEFAULT NOW(),
  answered_at TIMESTAMP,
  ended_at TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS incoming_calls_to_phone_idx ON incoming_calls(to_phone);
CREATE INDEX IF NOT EXISTS incoming_calls_status_idx ON incoming_calls(status);
CREATE INDEX IF NOT EXISTS incoming_calls_created_at_idx ON incoming_calls(created_at);


-- ─────────────────────────────────────────────────────────
-- 5. ENABLE REALTIME (for notifications)
-- ─────────────────────────────────────────────────────────
-- Note: Realtime must be enabled in Supabase dashboard:
-- Settings → Replication → Toggle ON for tables below

ALTER PUBLICATION supabase_realtime ADD TABLE incoming_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE call_history;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE users;


-- ═══════════════════════════════════════════════════════════
-- OPTIONAL: ROW LEVEL SECURITY (RLS) - For Production
-- ═══════════════════════════════════════════════════════════
-- Uncomment and modify these policies for production use
-- They ensure users can only see/modify their own data

-- -- Enable RLS on tables
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- -- Users can read their own record
-- CREATE POLICY "Users can read own data"
--   ON users FOR SELECT
--   USING (auth.uid() = id);

-- -- Users can read their own contacts
-- CREATE POLICY "Users can read own contacts"
--   ON contacts FOR SELECT
--   USING (user_id = auth.uid());

-- -- Users can create contacts
-- CREATE POLICY "Users can create contacts"
--   ON contacts FOR INSERT
--   WITH CHECK (user_id = auth.uid());

-- -- Users can delete their own contacts
-- CREATE POLICY "Users can delete own contacts"
--   ON contacts FOR DELETE
--   USING (user_id = auth.uid());

-- -- Users can read their own call history
-- CREATE POLICY "Users can read own history"
--   ON call_history FOR SELECT
--   USING (user_id = auth.uid());

-- -- Users can insert their own call history
-- CREATE POLICY "Users can insert history"
--   ON call_history FOR INSERT
--   WITH CHECK (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════
-- TEST DATA (Optional - Delete if you don't want test users)
-- ═══════════════════════════════════════════════════════════
-- Uncomment to add test users for development/testing

-- INSERT INTO users (username, name, phone, password_hash) VALUES
--   ('juan_dc', 'Juan Dela Cruz', '09171234567', 'hash123'),
--   ('maria_santos', 'Maria Santos', '09182345678', 'hash456'),
--   ('carlos_reyes', 'Carlos Reyes', '09193456789', 'hash789');


-- ═══════════════════════════════════════════════════════════
-- VERIFICATION QUERIES - Run these to check if setup worked
-- ═══════════════════════════════════════════════════════════

-- Check users table
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('users', 'contacts', 'call_history');

-- List all tables
-- SELECT * FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Show users
-- SELECT id, username, name, phone, created_at FROM users;

-- Show contacts
-- SELECT id, user_id, name, phone, created_at FROM contacts;

-- Show call history
-- SELECT id, user_id, number, direction, duration, timestamp FROM call_history;
