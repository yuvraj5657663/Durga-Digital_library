const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Authorization Header ka existence aur Bearer format verify karein
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: Token missing or ill-formed" });
  }

  // Token extract karein ("Bearer <TOKEN>")
  const token = authHeader.split(" ")[1];

  try {
    // JWT Token verify karein aur payload ko req.user mein attach karein
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key_123");
    req.user = decoded;
    
    next(); // Next middleware ya route handler par forward karein
  } catch (e) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
}

module.exports = authMiddleware;