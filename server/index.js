
import express from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import passport from 'passport';
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initThread, chatWithAssistant, uploadFiles } from './openai.js';
import { resetPassword, listUsers, addUser, rmUser } from './auth.js';
import './auth.js'; // passport config
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
app.use(express.json());
app.use(fileUpload({ createParentPath: true }));

// Session store
const PgStore = pgSession(session);
app.use(
  session({
    store: new PgStore({ pool }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 3600 * 1000 }
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Auth routes
app.post('/api/login', passport.authenticate('local'), (req, res) => res.json({ ok: true }));
app.post('/api/logout', (req, res) => { req.logout(() => res.json({ ok: true })); });
app.post('/api/reset-password', resetPassword);
// OAuth routes (GitHub & Google)
app.get('/auth/github', passport.authenticate('github'));
app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/')
);
app.get('/auth/google', passport.authenticate('google', { scope: ['email'] }));
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/')
);

// Admin user management
app.get('/api/users', ensureAuth, listUsers);
app.post('/api/users', ensureAuth, addUser);
app.delete('/api/users/:id', ensureAuth, rmUser);

// Protected AI routes
function ensureAuth(req, res, next) { (req.user) ? next() : res.status(401).end(); }
app.post('/api/thread/new', ensureAuth, initThread);
app.post('/api/chat', ensureAuth, chatWithAssistant);
app.post('/api/upload', ensureAuth, uploadFiles);
app.post('/api/upload-directory', ensureAuth, uploadFiles);

// Serve React app
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../client/build');
  app.use(express.static(clientPath));
  app.get('*', (req, res) =>
    res.sendFile(path.join(clientPath, 'index.html'))
  );
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on ${PORT}`));
