# Function-Based API Integration Guide

This guide explains how to use the new function-based PHP API with your React application.

## What Changed?

The API has been converted from a class-based approach to a function-based approach:

### Before (Class-based)
- Entry point: `MedooApi/index.php`
- Uses classes, namespaces, and autoloading
- Controllers in `controllers/` directory

### After (Function-based)
- Entry point: `MedooApi/api.php`
- Uses plain PHP functions
- Functions organized in `functions/` directory

## Setup Steps

### 1. Backend Configuration

The `.htaccess` file has been updated to route all requests to `api.php`:

```apache
RewriteEngine On

# Handle CORS preflight requests
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=200,L]

# Route all requests to api.php (function-based API)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ api.php [QSA,L]
```

### 2. Environment Variables

Update your `.env` file to point to the new API endpoint:

```env
VITE_API_URL=http://localhost/MedooApi/api.php
```

Or if you're using URL rewriting (which is configured by default):

```env
VITE_API_URL=http://localhost/MedooApi
```

### 3. React Configuration

The React app has been configured to use the new API:

**File:** `src/lib/api.ts`
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost/MedooApi/api.php';
```

## API Endpoints

All endpoints remain the same:

### Authentication Endpoints
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/register` - Register a new user
- `GET /api/auth/me` - Get current authenticated user

### Time Clock Endpoints
- `POST /api/timeclock/clock-in` - Clock in
- `POST /api/timeclock/clock-out` - Clock out
- `GET /api/timeclock/active` - Get active time entry
- `GET /api/timeclock/today` - Get today's entries
- `GET /api/timeclock/entries` - Get time entries (with date filters)
- `PUT /api/timeclock/entries` - Update a time entry

### Vacation Endpoints
- `GET /api/vacation/balance` - Get vacation balance
- `GET /api/vacation/requests` - Get vacation requests
- `POST /api/vacation/requests` - Create vacation request
- `PUT /api/vacation/requests` - Update vacation request
- `POST /api/vacation/requests/cancel` - Cancel vacation request

### Admin Endpoints
- `GET /api/admin/employees` - Get all employees
- `GET /api/admin/employee?id={id}` - Get specific employee
- `POST /api/admin/employees` - Create employee
- `PUT /api/admin/employees` - Update employee
- `DELETE /api/admin/employees` - Delete employee
- `GET /api/admin/time-entries` - Get all time entries
- `GET /api/admin/vacation-requests` - Get all vacation requests
- `POST /api/admin/vacation-requests/approve` - Approve vacation
- `POST /api/admin/vacation-requests/deny` - Deny vacation
- `GET /api/admin/work-schedules?employee_id={id}` - Get work schedules
- `POST /api/admin/work-schedules` - Save work schedule

## Request/Response Format

### Request Format
All POST/PUT requests expect JSON data:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Response Format
All responses follow this structure:

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message",
  "errors": null
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Login Flow:
1. User sends credentials to `/api/auth/login`
2. Server validates and returns a JWT token
3. Client stores token in localStorage
4. Client includes token in all subsequent requests

### Authorization Header:
```
Authorization: Bearer {token}
```

The React app automatically handles this via the `ApiClient` class in `src/lib/api.ts`.

## Function Files

The API is organized into these function files:

- **db.php** - Database connection (`get_db_connection()`)
- **response.php** - Response helpers (`send_success_response()`, `send_error_response()`)
- **jwt.php** - JWT operations (`jwt_encode()`, `jwt_decode()`, `get_token_from_header()`)
- **auth.php** - Authentication (`authenticate_user()`, `require_admin()`, `handle_login()`)
- **cors.php** - CORS handling (`handle_cors()`)
- **timeclock.php** - Time clock handlers
- **vacation.php** - Vacation handlers
- **admin.php** - Admin handlers

## Development Workflow

1. **Start your PHP server:**
   ```bash
   php -S localhost:8000 -t MedooApi
   ```

2. **Update environment variable if needed:**
   ```env
   VITE_API_URL=http://localhost:8000/api.php
   ```

3. **Start the React dev server:**
   ```bash
   npm run dev
   ```

4. **The React app will now communicate with the function-based API**

## Testing the API

You can test the API endpoints using curl:

### Login:
```bash
curl -X POST http://localhost/MedooApi/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

### Get Current User:
```bash
curl -X GET http://localhost/MedooApi/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Clock In:
```bash
curl -X POST http://localhost/MedooApi/api/timeclock/clock-in \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure:
1. The `.env` file in `MedooApi` has the correct `CORS_ORIGIN`
2. Your web server allows `.htaccess` overrides

### 404 Errors
If endpoints return 404:
1. Verify `.htaccess` is working (`AllowOverride All` in Apache config)
2. Check that `mod_rewrite` is enabled
3. Ensure the path in `VITE_API_URL` is correct

### Authentication Errors
If you get "Authentication required" errors:
1. Verify the token is being stored in localStorage
2. Check that the Authorization header is being sent
3. Ensure JWT secret is configured in `MedooApi/.env`

## Migration from Class-Based API

If you were using the class-based API before:

1. **No code changes needed in React** - The API interface is identical
2. **Update .htaccess** - Already done (routes to `api.php`)
3. **Update environment variable** - Already done
4. **Optional:** Remove old class-based files (`controllers/`, `middleware/`, `utils/`)

The function-based API is a drop-in replacement with no breaking changes!
