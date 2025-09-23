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
            try {
                req.patient = await Patient.findById(decoded.id).select('-password');
                if (!req.patient) {
                    console.error('Patient not found for ID:', decoded.id);
                    return res.status(401).json({ message: 'Not authorized, patient not found' });
                }
                //console.log('Patient authenticated:', req.patient.name);
            } catch (error) {
                console.error('Error finding patient:', error);
                return res.status(500).json({ message: 'Server error during authentication' });
            }
        } else if (decoded.type === 'admin') {
            try {
                req.admin = await Admin.findById(decoded.id).select('-password');
                if (!req.admin) {
                    console.error('Admin not found for ID:', decoded.id);
                    return res.status(401).json({ message: 'Not authorized, admin not found' });
                }
                // Check if admin account is active
                if (!req.admin.isActive) {
                    return res.status(401).json({ message: 'Account is deactivated' });
                }
                //console.log('Admin authenticated:', req.admin.name);
            } catch (error) {
                console.error('Error finding admin:', error);
                return res.status(500).json({ message: 'Server error during authentication' });
            }
        } else {
            // Default to doctor for backward compatibility
            try {
                req.doctor = await Doctor.findById(decoded.id).select('-password');
                if (!req.doctor) {
                    console.error('Doctor not found for ID:', decoded.id);
                    return res.status(401).json({ message: 'Not authorized, doctor not found' });
                }
                //console.log('Doctor authenticated:', req.doctor.name);
            } catch (error) {
                console.error('Error finding doctor:', error);
                return res.status(500).json({ message: 'Server error during authentication' });
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
