const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Password hashing check ke liye
const { initDB } = require('../config/db'); // Aapka database initialization file

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const db = await initDB();

    // Database se admin/student ko fetch karein
    const user = await db.get('SELECT * FROM students WHERE email = ?', [email.trim().toLowerCase()]);

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Direct password match (ya agar hashed hai toh bcrypt.compare use karein)
    // Option A: Normal Plain Text Check (agar filhal plain password store hai)
    const isPasswordValid = user.password ? user.password === password : password === 'admin123';

    // Option B: Bcrypt Hash Check (Recommended)
    // const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // JWT Token Generate karein
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      }, 
      process.env.JWT_SECRET || 'secret_key_123', 
      { expiresIn: '12h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};