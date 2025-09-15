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
import pool from './config/db.mjs'; // Import the pool
import './config/otpCleanup.mjs';   // Enable OTP auto-cleanup cron

dotenv.config();
const app = express();
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
    pool: pool, // Use your existing PostgreSQL pool
    tableName: 'session', // Table name for sessions
    createTableIfMissing: true, // Automatically create session table
    conObject: { // Explicitly pass database connection details
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Required for Render's SSL
    }
  }),
  secret: process.env.SESSION_SECRET, // Use the environment variable directly
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true,
    secure: true, // Enforce secure cookies for HTTPS on Render
    sameSite: 'lax', // Compatible with redirect after login
    maxAge: 24 * 60 * 60 * 1000 // 1 day default
  }
}));

// Log session creation for debugging
app.use((req, res, next) => {
  console.log('New request - Session ID:', req.sessionID, 'Session:', req.session, 'Cookies:', req.cookies);
  next();
});

// Log session save errors
app.use((err, req, res, next) => {
  console.error('Session save error:', err);
  next(err);
});

app.use('/api/auth', authRoutes);
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
  res.status(204).end(); // No content for favicon
});

// 404 handler (keep it last)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "..", "public", "404.html"));
});

// Server running ok!
const PORT = process.env.PORT || 10000; // Match Render.com's expected port
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
