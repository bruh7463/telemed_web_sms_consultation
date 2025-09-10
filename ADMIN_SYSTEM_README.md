# Admin User System Documentation

## Overview
The admin user system provides comprehensive user management capabilities for the telemedicine application. It includes role-based access control (RBAC), user administration, and secure authentication.

## Features
- **Admin Authentication**: Secure login/logout with HTTP-only cookies
- **Role-Based Access Control**: Super Admin, Admin, and Moderator roles
- **User Management**: CRUD operations for doctors, patients, and admins
- **Dashboard**: Statistics and quick actions for system overview
- **Permission System**: Granular permissions for different resources

## Getting Started

### 1. Database Setup
The admin system uses MongoDB with Mongoose. The `Admin` model is automatically created when the server starts.

### 2. Create Super Admin
A test super admin has been created with the following credentials:
- **Email**: admin@telemed.com
- **Password**: admin123
- **Role**: super_admin

### 3. Access Admin Panel
1. Navigate to `/admin/login` in your browser
2. Login with the super admin credentials
3. Access the dashboard at `/admin/dashboard`

## API Endpoints

### Authentication
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/admin/register` - Register new admin (requires super admin)
- `GET /api/auth/admin/status` - Check admin authentication status
- `POST /api/auth/logout` - Logout (works for all user types)

### Dashboard
- `GET /api/admin/dashboard` - Get dashboard statistics and recent consultations

### User Management
- `GET /api/admin/doctors` - List all doctors (with pagination and search)
- `GET /api/admin/doctors/:id` - Get doctor details
- `PUT /api/admin/doctors/:id` - Update doctor
- `DELETE /api/admin/doctors/:id` - Delete doctor

- `GET /api/admin/patients` - List all patients (with pagination and search)
- `GET /api/admin/patients/:id` - Get patient details
- `PUT /api/admin/patients/:id` - Update patient
- `DELETE /api/admin/patients/:id` - Delete patient

- `GET /api/admin/admins` - List all admins (super admin only)
- `POST /api/admin/admins` - Create new admin (super admin only)
- `PUT /api/admin/admins/:id` - Update admin (super admin only)
- `DELETE /api/admin/admins/:id` - Delete admin (super admin only)

## Roles and Permissions

### Super Admin
- Full access to all resources
- Can create, read, update, and delete all users
- Can manage other admins

### Admin
- Read and update access to users, doctors, patients, consultations, prescriptions
- Cannot manage other admins

### Moderator
- Read-only access to most resources
- Limited update capabilities

## Security Features

### Authentication
- Password hashing with bcrypt
- HTTP-only cookies for session management
- JWT tokens with 1-hour expiration
- Account activation/deactivation

### Authorization
- Middleware-based permission checking
- Role-based access control
- Resource-specific permissions

### Data Protection
- Passwords never returned in API responses
- Sensitive data excluded from queries
- Input validation and sanitization

## Frontend Components

### Pages
- `AdminLoginPage` - Login form for admins
- `AdminDashboard` - Main dashboard with statistics and navigation

### Features
- Responsive design with Tailwind CSS
- Real-time statistics display
- Quick action buttons for common tasks
- Recent consultations table
- Search and pagination for user lists

## Usage Examples

### Login as Admin
```javascript
const response = await api.post('/auth/admin/login', {
    email: 'admin@telemed.com',
    password: 'admin123'
});
```

### Get Dashboard Data
```javascript
const response = await api.get('/admin/dashboard');
// Returns statistics and recent consultations
```

### List Doctors with Search
```javascript
const response = await api.get('/admin/doctors?page=1&limit=10&search=john');
// Returns paginated list of doctors matching search
```

## Development Notes

### File Structure
```
server/
├── models/db.js - Database models including Admin
├── middleware/auth.js - Authentication middleware
├── routes/
│   ├── auth_routes.js - Authentication routes
│   └── admin_routes.js - Admin management routes
└── server.js - Main server file

client/src/
├── pages/
│   ├── AdminLoginPage.jsx - Admin login page
│   └── AdminDashboard.jsx - Admin dashboard
└── App.jsx - Main app with routing
```

### Environment Variables
Make sure your `.env` file includes:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens

### Testing
Use the test script to create additional admin users:
```bash
cd server
node test_admin_setup.js
```

## Future Enhancements

### Planned Features
- Audit logging for all admin actions
- Two-factor authentication
- Password reset functionality
- Email notifications for admin actions
- Advanced permission management UI
- Bulk user operations
- Export functionality for user data

### Security Improvements
- Rate limiting for authentication endpoints
- Session management improvements
- IP-based access restrictions
- Advanced password policies
- Security event monitoring

## Troubleshooting

### Common Issues
1. **Cannot login**: Check if admin account is active
2. **Permission denied**: Verify user role and permissions
3. **Database connection**: Ensure MongoDB is running and URI is correct

### Debug Mode
Set `NODE_ENV=development` for detailed error logging.

## Support
For issues or questions about the admin system, refer to the API documentation or check the server logs for error details.
