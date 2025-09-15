import express from 'express';

export async function authMiddleware(req, res, next) {
  console.log('Auth Middleware - Session:', req.session, 'Cookies:', req.cookies);
  if (!req.session || !req.session.user) {
    console.log('Auth Middleware - Unauthorized: No session or user');
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ error: 'Unauthorized. Please login.' });
    } else {
      return res.redirect('/login.html');
    }
  }
  req.user = req.session.user;
  console.log('Auth Middleware - User:', req.user);
  next();
}
