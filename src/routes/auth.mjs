import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/db.mjs';
import { createUser, findUserByEmail, findUserById } from '../models/user.mjs';
import { sendMail } from '../utils/mailer.mjs';
import { authMiddleware } from '../middlewares/auth.mjs';

const router = express.Router();

// Dashboard API (protected)
router.get('/dashboard', authMiddleware, (req, res) => {
  res.json({ message: `Welcome, user ${req.user.id}` });
});

// Helper: generate OTP (6-digit)
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// REGISTER → Send OTP
router.post('/register', async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|info|biz|co|in)$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO otps (email, code, purpose, expires_at) VALUES ($1,$2,$3,$4)',
      [email, otp, 'register', expires_at]
    );

    await sendMail({
      to: email,
      subject: 'DW-DURGA - Verify your email',
      text: `Your OTP code is <strong>${otp}</strong>. It expires in 10 minutes.`,
    });

    req.session = req.session || {};
    req.session[email] = { full_name, email, password_hash };

    res.json({ message: 'OTP sent to email. Please verify.' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// VERIFY OTP → Activate user
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    const result = await pool.query(
      'SELECT * FROM otps WHERE email=$1 AND code=$2 AND used=false AND expires_at > now()',
      [email, otp]
    );
    const record = result.rows[0];
    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await pool.query('DELETE FROM otps WHERE id=$1', [record.id]);

    const sessionUser = req.session?.[email];
    if (!sessionUser) {
      return res.status(400).json({ error: 'No registration session found' });
    }

    const user = await createUser({
      full_name: sessionUser.full_name,
      email: sessionUser.email,
      password_hash: sessionUser.password_hash,
    });

    delete req.session[email];

    res.json({ message: 'Registration successful. Please login.', user });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

// RESEND OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|info|biz|co|in)$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already verified. Please login.' });
    }

    const otp = generateOtp();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query('DELETE FROM otps WHERE email=$1 AND purpose=$2', [email, 'register']);
    await pool.query(
      'INSERT INTO otps (email, code, purpose, expires_at) VALUES ($1,$2,$3,$4)',
      [email, otp, 'register', expires_at]
    );

    await sendMail({
      to: email,
      subject: 'DW-DURGA - OTP for Email Verification',
      text: `Your new OTP is: <strong>${otp}</strong>. It expires in 10 minutes.`,
    });

    return res.json({ message: 'New OTP sent to your email.' });
  } catch (err) {
    console.error('Resend OTP error:', err.message);
    return res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.is_active) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Set session data
    req.session.user = { id: user.id, role: user.role_name };
    req.session.cookie.maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 7 days or 1 day

    try {
      await pool.query('UPDATE users SET is_logged_in = true WHERE id = $1', [user.id]);
    } catch (dbErr) {
      console.error('Failed to set is_logged_in on login:', dbErr.message);
    }

    res.json({ message: 'Login successful', redirect: '/dashboard.html' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// FORGOT PASSWORD → Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|info|biz|co|in)$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = generateOtp();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO otps (email, code, purpose, expires_at, used) VALUES ($1,$2,$3,$4,$5)',
      [email, otp, 'forgot-password', expires_at, false]
    );

    await sendMail({
      to: email,
      subject: 'DW-DURGA - Password Reset OTP',
      text: `Your OTP code is: <strong>${otp}</strong>. It expires in 10 minutes.`,
    });

    res.json({ message: 'Password reset OTP sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to process forgot password' });
  }
});

// RESET PASSWORD → Verify OTP and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Email, OTP and both passwords are required' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|info|biz|co|in)$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const otpResult = await pool.query(
      'SELECT * FROM otps WHERE email=$1 AND code=$2 AND purpose=$3 AND used=false AND expires_at > now()',
      [email, otp, 'forgot-password']
    );
    const record = otpResult.rows[0];
    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE email=$2', [hashed, email]);
    await pool.query('UPDATE otps SET used = true WHERE id = $1', [record.id]);

    res.json({ message: 'Password reset successful. Please login.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGOUT
router.post('/logout', async (req, res) => {
  try {
    if (req.session.user) {
      await pool.query('UPDATE users SET is_logged_in = false WHERE id = $1', [req.session.user.id]);
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err.message);
      });
    }
  } catch (e) {
    console.error('Logout cleanup error:', e.message);
  }

  res.clearCookie('connect.sid', { // Clear the session cookie
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ message: 'Logged out successfully' });
});

// Dashboard Data
router.get('/dashboard-data', authMiddleware, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    res.json({
      message: user.full_name,
      role: user.role_name,
      is_logged_in: user.is_logged_in,
    });
  } catch (err) {
    console.error('Dashboard data error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Current user info
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role_name,
    });
  } catch (err) {
    console.error('Error in /me route:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;