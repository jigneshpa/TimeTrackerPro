# Time Tracking API - Node.js

A REST API built with Node.js, Express, and MySQL for time tracking application.

## Features

- JWT-based authentication
- Employee time clock management
- Vacation request handling
- Admin dashboard functionality
- MySQL database integration
- CORS support

## Prerequisites

- Node.js (v18 or higher)
- MySQL database
- npm or yarn

## Installation

1. **Install dependencies:**
```bash
cd NodeApi
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and set your database credentials and JWT secret:
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=time_tracking
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=24h

CORS_ORIGIN=http://localhost:5173
```

3. **Create database:**
Use the MySQL schema from `../database/mysql-schema.sql` to create the database tables.

## Running the Server

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Time Clock
- `POST /api/timeclock/clock-in` - Clock in
- `POST /api/timeclock/clock-out` - Clock out
- `GET /api/timeclock/active` - Get active entry
- `GET /api/timeclock/today` - Get today's entries
- `GET /api/timeclock/entries` - Get time entries
- `PUT /api/timeclock/entries` - Update entry

### Vacation
- `GET /api/vacation/balance` - Get vacation balance
- `GET /api/vacation/requests` - Get vacation requests
- `POST /api/vacation/requests` - Create request
- `PUT /api/vacation/requests` - Update request
- `POST /api/vacation/requests/cancel` - Cancel request

### Admin
- `GET /api/admin/employees` - Get all employees
- `GET /api/admin/employee?id={id}` - Get employee by ID
- `POST /api/admin/employees` - Create employee
- `PUT /api/admin/employees` - Update employee
- `DELETE /api/admin/employees` - Delete employee
- `GET /api/admin/time-entries` - Get all time entries
- `GET /api/admin/vacation-requests` - Get all vacation requests
- `POST /api/admin/vacation-requests/approve` - Approve vacation
- `POST /api/admin/vacation-requests/deny` - Deny vacation
- `GET /api/admin/work-schedules?employee_id={id}` - Get schedules
- `POST /api/admin/work-schedules` - Save schedule

## Request/Response Format

### Request Headers
```
Content-Type: application/json
Authorization: Bearer {token}
```

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": null
}
```

## Project Structure

```
NodeApi/
├── config/
│   └── database.js          # MySQL connection pool
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── timeclock.js         # Time clock routes
│   ├── vacation.js          # Vacation routes
│   └── admin.js             # Admin routes
├── utils/
│   ├── jwt.js               # JWT utilities
│   └── response.js          # Response helpers
├── .env                     # Environment variables
├── .env.example             # Example environment file
├── package.json             # Dependencies
├── server.js                # Main server file
└── README.md
```

## Testing

You can test the API using curl:

### Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

### Get Current User:
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Clock In:
```bash
curl -X POST http://localhost:3000/api/timeclock/clock-in \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Deployment

For production deployment:

1. Set `NODE_ENV=production` in `.env`
2. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start server.js --name time-tracking-api
```

3. Set up a reverse proxy (nginx) to forward requests to the Node.js server

## Security

- JWT tokens expire after 24 hours (configurable)
- Passwords are hashed using bcrypt
- CORS is configured to allow specific origins
- SQL injection prevention through parameterized queries

## License

ISC
