// Test script to create a super admin user for testing the admin system
// Run this with: node test_admin_setup.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { Admin, connectDB } = require('../models/db');

async function createSuperAdmin() {
    try {
        // Connect to database
        await connectDB();

        // Check if super admin already exists
        const existingSuperAdmin = await Admin.findOne({ role: 'super_admin' });
        if (existingSuperAdmin) {
            console.log('Super admin already exists:', existingSuperAdmin.email);
            return;
        }

        // Create super admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const superAdmin = new Admin({
            name: 'Super Admin',
            email: 'admin@telemed.com',
            password: hashedPassword,
            role: 'super_admin',
            permissions: [
                { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
                { resource: 'doctors', actions: ['create', 'read', 'update', 'delete'] },
                { resource: 'patients', actions: ['create', 'read', 'update', 'delete'] },
                { resource: 'consultations', actions: ['create', 'read', 'update', 'delete'] },
                { resource: 'prescriptions', actions: ['create', 'read', 'update', 'delete'] },
                { resource: 'admins', actions: ['create', 'read', 'update', 'delete'] }
            ]
        });

        await superAdmin.save();

        console.log('Super admin created successfully!');
        console.log('Email: admin@telemed.com');
        console.log('Password: admin123');
        console.log('Role: super_admin');

    } catch (error) {
        console.error('Error creating super admin:', error);
    } finally {
        await mongoose.connection.close();
    }
}

// Run the setup
createSuperAdmin();
