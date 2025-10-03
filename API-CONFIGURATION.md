# API Configuration Guide

This document explains how to configure the React frontend to use different backend APIs.

## Available APIs

The project includes three backend API options:

### 1. Node.js API (Express)
- **Location**: `NodeApi/`
- **URL**: `http://localhost:3000`
- **Technology**: Node.js, Express, MySQL2
- **Start Command**: `cd NodeApi && npm run dev`

### 2. PHP MedooAPI (Function-based)
- **Location**: `MedooApi/`
- **URL**: `http://localhost:8000/api.php` or `http://localhost/MedooApi/api.php`
- **Technology**: PHP, Medoo Framework
- **Start Command**:
  - Built-in server: `cd MedooApi && php -S localhost:8000`
  - Apache/Nginx: Configure web server to point to MedooApi directory

### 3. Laravel API
- **Location**: `LaravelBackend/`
- **URL**: `http://localhost:8000/api`
- **Technology**: Laravel
- **Start Command**: `cd LaravelBackend && php artisan serve`

## Switching Between APIs

### Method 1: Using Environment Variable (Recommended)

Edit the `.env` file in the project root:

```env
# For Node.js API
VITE_API_URL=http://localhost:3000

# For PHP MedooAPI (built-in server)
VITE_API_URL=http://localhost:8000/api.php

# For PHP MedooAPI (Apache)
VITE_API_URL=http://localhost/MedooApi/api.php

# For Laravel API
VITE_API_URL=http://localhost:8000/api
```

After changing the `.env` file, restart the React dev server:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### Method 2: Direct Code Change

Edit `src/lib/api.ts` and change the default URL:

```typescript
// For Node.js API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// For PHP MedooAPI
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api.php';
```

## Two-Database Configuration

Both **Node.js API** and **MedooAPI** support the two-database architecture:

- **DatabaseA**: Laravel users (authentication)
- **DatabaseB**: Time tracking data

### Configure Node.js API

Edit `NodeApi/.env`:

```env
# Database A - Laravel Users
DBA_HOST=localhost
DBA_NAME=database_a
DBA_USER=root
DBA_PASSWORD=

# Database B - Time Tracking
DBB_HOST=localhost
DBB_NAME=time_tracking
DBB_USER=root
DBB_PASSWORD=
```

### Configure MedooAPI

Edit `MedooApi/.env`:

```env
# Database A - Laravel Users
DBA_HOST=localhost
DBA_NAME=database_a
DBA_USER=root
DBA_PASSWORD=

# Database B - Time Tracking
DBB_HOST=localhost
DBB_NAME=time_tracking
DBB_USER=root
DBB_PASSWORD=
```

## API Endpoints

All three APIs implement the same REST endpoints:

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### Time Clock
- `POST /api/timeclock/clock-in`
- `POST /api/timeclock/clock-out`
- `GET /api/timeclock/active`
- `GET /api/timeclock/today`
- `GET /api/timeclock/entries`
- `PUT /api/timeclock/entries`

### Vacation
- `GET /api/vacation/balance`
- `GET /api/vacation/requests`
- `POST /api/vacation/requests`
- `PUT /api/vacation/requests`
- `POST /api/vacation/requests/cancel`

### Admin
- `GET /api/admin/employees`
- `GET /api/admin/employee`
- `POST /api/admin/employees`
- `PUT /api/admin/employees`
- `DELETE /api/admin/employees`
- `GET /api/admin/time-entries`
- `GET /api/admin/vacation-requests`
- `POST /api/admin/vacation-requests/approve`
- `POST /api/admin/vacation-requests/deny`
- `GET /api/admin/work-schedules`
- `POST /api/admin/work-schedules`

## Quick Start Examples

### Using Node.js API

```bash
# Terminal 1 - Start Node.js API
cd NodeApi
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev

# Terminal 2 - Start React App
# Make sure .env has: VITE_API_URL=http://localhost:3000
npm run dev
```

### Using MedooAPI

```bash
# Terminal 1 - Start PHP built-in server
cd MedooApi
composer install
cp .env.example .env
# Edit .env with your database credentials
php -S localhost:8000

# Terminal 2 - Start React App
# Edit .env: VITE_API_URL=http://localhost:8000/api.php
npm run dev
```

### Using Apache with MedooAPI

```bash
# Configure Apache to serve MedooApi directory
# For example, place project in /var/www/html/

# Start React App
# Edit .env: VITE_API_URL=http://localhost/MedooApi/api.php
npm run dev
```

## Testing the API Connection

You can test the API connection using curl:

### Test Node.js API

```bash
curl http://localhost:3000
# Should return: {"success":true,"message":"Time Tracking API","version":"1.0.0",...}
```

### Test MedooAPI

```bash
curl http://localhost:8000/api.php
# Should return: {"success":true,"message":"Time Tracking API - Medoo",...}
```

### Test Login

```bash
# Node.js API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# MedooAPI
curl -X POST http://localhost:8000/api.php/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

## Troubleshooting

### React app can't connect to API

1. Verify the API server is running
2. Check the URL in `.env` matches your API server
3. Restart React dev server after changing `.env`
4. Check browser console for CORS errors

### CORS Errors

**Node.js API**: Edit `NodeApi/.env`
```env
CORS_ORIGIN=http://localhost:5173
```

**MedooAPI**: Edit `MedooApi/.env`
```env
CORS_ORIGIN=http://localhost:5173
```

### API returns 404

- **Node.js**: Ensure endpoints start with `/api/` (e.g., `/api/auth/login`)
- **MedooAPI**: Ensure URL includes `api.php` (e.g., `http://localhost:8000/api.php`)

### Database Connection Errors

1. Verify MySQL is running
2. Check database credentials in API's `.env` file
3. Ensure databases exist:
   ```bash
   mysql -u root -p -e "SHOW DATABASES;"
   ```
4. Import schema if needed:
   ```bash
   mysql -u root -p < database/mysql-schema.sql
   ```

## API Comparison

| Feature | Node.js API | MedooAPI | Laravel API |
|---------|-------------|----------|-------------|
| Language | JavaScript | PHP | PHP |
| Performance | Fast | Good | Good |
| Setup Complexity | Easy | Easy | Medium |
| Async/Await | Native | No | Via Promises |
| Modern Syntax | ES6+ | PHP 7+ | PHP 8+ |
| Type Safety | TypeScript | No | Some |
| Dependencies | npm | Composer | Composer |
| Hot Reload | Yes | No | No |
| Production Ready | Yes | Yes | Yes |

## Recommended Setup

- **Development**: Node.js API (fast, hot reload, modern tooling)
- **Production**: Any of the three (all are production-ready)
- **Laravel Integration**: Use MedooAPI or Laravel API for seamless integration

## Environment Variables Summary

```env
# Required for React App
VITE_API_URL=http://localhost:3000  # or your chosen API URL

# Supabase (optional, if using Supabase features)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## Additional Resources

- Node.js API Documentation: `NodeApi/README.md`
- MedooAPI Documentation: `MedooApi/README.md`
- Two-Database Setup: `NodeApi/TWO-DATABASE-SETUP.md` or `MedooApi/TWO-DATABASE-SETUP.md`
