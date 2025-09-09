// File: server/middleware/auth.js
// Description: Middleware to protect routes by verifying JWT.

const jwt = require('jsonwebtoken');
const { Doctor } = require('../models/db');

const protect = async (req, res, next) => {
    let token;

    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    // If no token found in cookie, deny authorization
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token in cookie' });
    }

    try {
        // Verify token (this part remains the same)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get doctor from the token (excluding password)
        req.doctor = await Doctor.findById(decoded.id).select('-password');

        if (!req.doctor) {
            return res.status(401).json({ message: 'Not authorized, doctor not found' });
        }

        next(); // Proceed to the next middleware/route handler
    } catch (error) {
        // Handle token verification errors
        console.error("Token verification failed:", error); // Log the actual error for debugging
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

module.exports = { protect };