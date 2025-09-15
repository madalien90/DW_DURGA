export async function authMiddleware(req, res, next) {
  console.log('Auth Middleware - Session:', req.session);
  console.log('Auth Middleware - Cookies:', req.cookies);
  // Check if session exists and contains user data
  if (!req.session || !req.session.user) {
    console.log('Auth Middleware - Unauthorized: No session or user');
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ error: 'Unauthorized. Please login.' });
    } else {
      return res.redirect('/login.html');
    }
  }

  // Set user data from session
  req.user = req.session.user; // { id, role }
  console.log('Auth Middleware - User:', req.user);
  next();
}
