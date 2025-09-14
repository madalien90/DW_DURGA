// src/middlewares/auth.mjs
export async function authMiddleware(req, res, next) {
  // Check if session exists and contains user data
  if (!req.session || !req.session.user) {
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ error: 'Unauthorized. Please login.' });
    } else {
      return res.redirect('/login.html');
    }
  }

  // Set user data from session
  req.user = req.session.user; // { id, role }
  next();
}