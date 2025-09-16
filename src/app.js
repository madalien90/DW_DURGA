import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './middlewares/auth.mjs';
import authRoutes from './routes/auth.mjs';
import usersRoutes from './routes/users.mjs';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import pgSession from 'connect-pg-simple';
import pool from './config/db.mjs';
import './config/otpCleanup.mjs';

dotenv.config();
const app = express();
app.set('trust proxy', 1); // Trust Render's proxy for HTTPS and cookies
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Core middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure PostgreSQL session store
const PgStore = pgSession(session);
app.use(session({
  store: new PgStore({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
    conObject: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Log session creation and errors
app.use((req, res, next) => {
  console.log('New request - Session ID:', req.sessionID, 'Session:', req.session, 'Cookies:', req.cookies);
  next();
});

app.use((err, req, res, next) => {
  console.error('Session save error:', err);
  next(err);
});

// Add logging to auth routes
app.use('/api/auth', (req, res, next) => {
  console.log(`Auth route ${req.method} ${req.url} - Session:`, req.session);
  next();
}, authRoutes);
app.use('/api/users', usersRoutes);

// Protected
app.get('/dashboard.html', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// Static (`public` folder)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// Handle favicon.ico to prevent 404
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// 404 handler (keep it last)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "..", "public", "404.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
