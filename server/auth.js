import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import { pool } from './db.js';
import { sendTempPassword } from './email.js';

// Serialize and deserialize user
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const { rows } = await pool.query('SELECT id, email FROM users WHERE id=$1', [id]);
  done(null, rows[0] || false);
});

// Local Strategy
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, pw, done) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  const user = rows[0];
  if (!user) return done(null, false);
  const ok = await bcrypt.compare(pw, user.password_hash);
  return done(null, ok ? user : false);
}));

// GitHub Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_ID,
  clientSecret: process.env.GITHUB_SECRET,
  callbackURL: '/auth/github/callback'
}, async (accessToken, refreshToken, profile, done) => {
  // Upsert user by email
  const email = profile.emails[0].value;
  const res = await pool.query(
    `INSERT INTO users(email) VALUES($1)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email`,
    [email]
  );
  const user = res.rows[0] || (await pool.query('SELECT id, email FROM users WHERE email=$1', [email])).rows[0];
  done(null, user);
}));

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_ID,
  clientSecret: process.env.GOOGLE_SECRET,
  callbackURL: '/auth/google/callback'
}, async (token, tokenSecret, profile, done) => {
  const email = profile.emails[0].value;
  const res = await pool.query(
    `INSERT INTO users(email) VALUES($1)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email`,
    [email]
  );
  const user = res.rows[0] || (await pool.query('SELECT id, email FROM users WHERE email=$1', [email])).rows[0];
  done(null, user);
}));

// Password Reset Route
export async function resetPassword(req, res) {
  const { email } = req.body;
  // Throttle: allow once per 24h
  const { rows } = await pool.query('SELECT reset_at FROM users WHERE email=$1', [email]);
  const last = rows[0]?.reset_at;
  if (last && new Date() - new Date(last) < 24 * 3600 * 1000) {
    return res.status(429).json({ error: 'Reset allowed once per 24 hours' });
  }
  const temp = Math.random().toString(36).slice(-10);
  const hash = await bcrypt.hash(temp, 10);
  await pool.query('UPDATE users SET password_hash=$1, reset_at=NOW() WHERE email=$2', [hash, email]);
  await sendTempPassword(email, temp);
  res.json({ ok: true });
}

// Admin user management
export async function listUsers(req, res) {
  const { rows } = await pool.query('SELECT id, email FROM users');
  res.json(rows);
}
export async function addUser(req, res) {
  const { email } = req.body;
  const temp = Math.random().toString(36).slice(-10);
  const hash = await bcrypt.hash(temp, 10);
  const { rows } = await pool.query(
    'INSERT INTO users(email, password_hash) VALUES($1, $2) RETURNING id, email',
    [email, hash]
  );
  await sendTempPassword(email, temp);
  res.json(rows[0]);
}
export async function rmUser(req, res) {
  const { id } = req.params;
  await pool.query('DELETE FROM users WHERE id=$1', [id]);
  res.json({ ok: true });
}