# Node.js API Setup Guide

This guide explains how to use the new Node.js API with your React application.

## What Changed?

The API has been completely rewritten in Node.js:

### Before
- PHP with Medoo framework
- Apache/PHP server required
- Class-based or function-based PHP

### After
- Node.js with Express
- Standalone Node.js server
- Modern JavaScript/ES6 modules
- MySQL2 for database
- JWT for authentication

## Features

- RESTful API design
- JWT-based authentication
- MySQL database integration
- CORS support
- bcrypt password hashing
- Async/await pattern
- Error handling middleware

## Directory Structure

```
NodeApi/
├── config/
│   └── database.js          # MySQL connection pool
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── timeclock.js         # Time clock endpoints
│   ├── vacation.js          # Vacation endpoints
│   └── admin.js             # Admin endpoints
├── utils/
│   ├── jwt.js               # JWT utilities
│   └── response.js          # Response helpers
├── .env                     # Environment configuration
├── .env.example             # Example environment file
├── package.json             # Dependencies
├── server.js                # Main server file
└── README.md                # API documentation
```

## Installation

### 1. Install Node.js Dependencies

```bash
cd NodeApi
npm install
```

This will install:
- express - Web framework
- mysql2 - MySQL client
- jsonwebtoken - JWT handling
- bcryptjs - Password hashing
- dotenv - Environment variables
- cors - Cross-origin requests

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

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

### 3. Setup Database

Use the existing MySQL schema:

```bash
mysql -u root -p < ../database/mysql-schema.sql
```

Or import it manually into your MySQL database.

### 4. Start the Server

**Development mode (auto-restart on changes):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## React Integration

The React app has been configured to use the Node.js API:

### Environment Variable

`.env` file updated:
```env
VITE_API_URL=http://localhost:3000
```

### API Client

`src/lib/api.ts` now points to:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

## API Endpoints

All endpoints remain the same as before:

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### Time Clock
- `POST /api/timeclock/clock-in`
- `POST /api/timeclock/clock-out`
- `GET /api/timeclock/active`
- `GET /api/timeclock/today`
- `GET /api/timeclock/entries?start_date=&end_date=`
- `PUT /api/timeclock/entries`

### Vacation
- `GET /api/vacation/balance`
- `GET /api/vacation/requests`
- `POST /api/vacation/requests`
- `PUT /api/vacation/requests`
- `POST /api/vacation/requests/cancel`

### Admin
- `GET /api/admin/employees`
- `GET /api/admin/employee?id={id}`
- `POST /api/admin/employees`
- `PUT /api/admin/employees`
- `DELETE /api/admin/employees`
- `GET /api/admin/time-entries?start_date=&end_date=&employee_id=`
- `GET /api/admin/vacation-requests?status=`
- `POST /api/admin/vacation-requests/approve`
- `POST /api/admin/vacation-requests/deny`
- `GET /api/admin/work-schedules?employee_id={id}`
- `POST /api/admin/work-schedules`

## Running the Full Stack

### Terminal 1 - Node.js API:
```bash
cd NodeApi
npm run dev
```

### Terminal 2 - React App:
```bash
npm run dev
```

Now open `http://localhost:5173` to use the application.

## Request/Response Format

### Request Headers
```
Content-Type: application/json
Authorization: Bearer {your-jwt-token}
```

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
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

## Testing the API

Using curl:

### Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

### Get Current User:
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Clock In:
```bash
curl -X POST http://localhost:3000/api/timeclock/clock-in \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Advantages of Node.js API

1. **Better Performance**: Non-blocking I/O and event-driven architecture
2. **Modern JavaScript**: ES6+ features, async/await
3. **Unified Language**: Same language as React frontend
4. **NPM Ecosystem**: Access to thousands of packages
5. **Easy Deployment**: Simple to deploy on various platforms
6. **Real-time Capabilities**: Easy to add WebSocket support if needed
7. **Better Tooling**: Modern development tools and debugging

## Production Deployment

### Using PM2 (Process Manager):

```bash
npm install -g pm2

cd NodeApi
pm2 start server.js --name time-tracking-api
pm2 save
pm2 startup
```

### Using Docker:

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t time-tracking-api .
docker run -p 3000:3000 --env-file .env time-tracking-api
```

### Environment Variables for Production:

```env
NODE_ENV=production
PORT=3000
DB_HOST=your-production-db-host
DB_NAME=time_tracking
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
JWT_SECRET=your-very-secure-secret-key-at-least-32-characters
CORS_ORIGIN=https://your-production-domain.com
```

## Security Considerations

1. **JWT Secret**: Use a strong, unique secret in production
2. **CORS**: Set specific origin instead of wildcard
3. **HTTPS**: Always use HTTPS in production
4. **Database**: Use secure credentials and limit permissions
5. **Rate Limiting**: Consider adding rate limiting middleware
6. **Helmet**: Add helmet middleware for security headers

## Troubleshooting

### Port Already in Use:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port in .env
PORT=3001
```

### Database Connection Error:
- Verify MySQL is running
- Check credentials in `.env`
- Ensure database exists
- Test connection: `mysql -u root -p`

### CORS Errors:
- Verify `CORS_ORIGIN` in `.env` matches React dev server
- Check that both servers are running
- Clear browser cache

### Module Not Found:
```bash
cd NodeApi
rm -rf node_modules package-lock.json
npm install
```

## Migration from PHP API

No changes needed in React code. The Node.js API is a drop-in replacement with identical endpoints and response formats.

Just:
1. Start Node.js server
2. Update `VITE_API_URL` to `http://localhost:3000`
3. Restart React dev server

That's it!
