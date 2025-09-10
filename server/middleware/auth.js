// File: server/middleware/auth.js
// Description: Middleware to protect routes by verifying JWT.

const jwt = require('jsonwebtoken');
const { Doctor, Patient, Admin } = require('../models/db');

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
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check user type and set appropriate req property
        if (decoded.type === 'patient') {
            req.patient = await Patient.findById(decoded.id).select('-password');
            if (!req.patient) {
                return res.status(401).json({ message: 'Not authorized, patient not found' });
            }
        } else if (decoded.type === 'admin') {
            req.admin = await Admin.findById(decoded.id).select('-password');
            if (!req.admin) {
                return res.status(401).json({ message: 'Not authorized, admin not found' });
            }
            // Check if admin account is active
            if (!req.admin.isActive) {
                return res.status(401).json({ message: 'Account is deactivated' });
            }
        } else {
            // Default to doctor for backward compatibility
            req.doctor = await Doctor.findById(decoded.id).select('-password');
            if (!req.doctor) {
                return res.status(401).json({ message: 'Not authorized, doctor not found' });
            }
        }

        next(); // Proceed to the next middleware/route handler
    } catch (error) {
        // Handle token verification errors
        console.error("Token verification failed:", error); // Log the actual error for debugging
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// Middleware to ensure only admin users can access
const requireAdmin = async (req, res, next) => {
    if (!req.admin) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Middleware to check specific permissions
const requirePermission = (resource, action) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Super admin has all permissions
        if (req.admin.role === 'super_admin') {
            return next();
        }

        // Check if admin has the required permission
        const permission = req.admin.permissions.find(p => p.resource === resource);
        if (!permission || !permission.actions.includes(action)) {
            return res.status(403).json({
                message: `Permission denied: ${action} on ${resource}`
            });
        }

        next();
    };
};

module.exports = { protect, requireAdmin, requirePermission };
