# MedooAPI Installation Guide

## Prerequisites

- PHP 7.4 or higher
- Composer (PHP dependency manager)
- MySQL 5.7 or higher
- Apache/Nginx or PHP built-in server

## Step 1: Install Composer

If you don't have Composer installed, download it from: https://getcomposer.org/download/

### Windows (WAMP/XAMPP)
1. Download and run the Composer installer
2. It will automatically detect your PHP installation

### Verify Composer Installation
```bash
composer --version
```

## Step 2: Install MedooAPI Dependencies

Navigate to the MedooApi directory and run:

```bash
cd C:\wamp64\www\MedooApi
composer install
```

This will install:
- **Medoo** (Database framework)
- **Firebase PHP-JWT** (JWT authentication)

### If you get "composer: command not found"

**Option A: Add Composer to PATH**
1. Find where Composer is installed (usually `C:\ProgramData\ComposerSetup\bin`)
2. Add it to your System PATH environment variable

**Option B: Use full path**
```bash
php C:\ProgramData\ComposerSetup\bin\composer.phar install
```

**Option C: Use Composer via PHP**
```bash
php composer.phar install
```

## Step 3: Configure Environment Variables

1. Copy the example environment file:
```bash
copy .env.example .env
```

2. Edit `.env` with your database credentials:

### For Two-Database Setup:

```env
# Database A - Laravel Users Database
DBA_HOST=localhost
DBA_NAME=database_a
DBA_USER=root
DBA_PASSWORD=your_password
DBA_PORT=3306

# Database B - Time Tracking Database
DBB_HOST=localhost
DBB_NAME=time_tracking
DBB_USER=root
DBB_PASSWORD=your_password
DBB_PORT=3306

JWT_SECRET=your-secret-key-change-this-in-production
CORS_ORIGIN=http://localhost:5173
```

### For Single Database Setup:

If you're not using the two-database setup yet:

```env
DB_HOST=localhost
DB_NAME=time_tracking
DB_USER=root
DB_PASSWORD=your_password
DB_PORT=3306

JWT_SECRET=your-secret-key-change-this-in-production
CORS_ORIGIN=http://localhost:5173
```

## Step 4: Create Databases

### Two-Database Setup:

```sql
-- Connect to MySQL
mysql -u root -p

-- Create Database A (Laravel Users)
CREATE DATABASE database_a;
USE database_a;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_email (email)
);

-- Create Database B (Time Tracking)
CREATE DATABASE time_tracking;
```

Then import the schema:
```bash
mysql -u root -p time_tracking < ../database/mysql-schema.sql
```

## Step 5: Verify Installation

### Check vendor directory exists:
```bash
dir vendor
```

You should see:
- `vendor/catfan/medoo/`
- `vendor/firebase/php-jwt/`
- `vendor/autoload.php`

## Step 6: Configure Apache (WAMP)

Your Apache is already configured since you can access:
`http://localhost/MedooApi/api.php`

### Verify .htaccess

Make sure `.htaccess` exists in MedooApi folder:

```apache
# Enable rewrite engine
RewriteEngine On

# Allow CORS
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"

# Handle preflight requests
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=200,L]

# Route all requests through api.php
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ api.php?request=$1 [QSA,L]
```

## Step 7: Test the API

### Test in Browser:
Visit: `http://localhost/MedooApi/api.php`

You should see:
```json
{
  "success": true,
  "message": "Time Tracking API - Medoo",
  "version": "1.0.0"
}
```

### Test with cURL:

```bash
curl http://localhost/MedooApi/api.php
```

### Test Login:

```bash
curl -X POST http://localhost/MedooApi/api.php/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"password123\"}"
```

## Step 8: Configure React Frontend

Update your React app's `.env` file:

```env
VITE_API_URL=http://localhost/MedooApi/api.php
```

Then restart the React dev server:
```bash
npm run dev
```

## Common Issues

### Issue: "vendor/autoload.php not found"

**Solution**: Run `composer install` in the MedooApi directory

```bash
cd C:\wamp64\www\MedooApi
composer install
```

### Issue: "Class 'Medoo\Medoo' not found"

**Solution**:
1. Delete vendor folder and composer.lock
2. Run `composer install` again

```bash
rmdir /s vendor
del composer.lock
composer install
```

### Issue: "Database connection failed"

**Solution**:
1. Verify MySQL is running in WAMP
2. Check database credentials in `.env`
3. Create databases if they don't exist
4. Verify database user has permissions

### Issue: CORS errors in browser console

**Solution**: Update `.env`:
```env
CORS_ORIGIN=http://localhost:5173
```

And verify `.htaccess` has CORS headers.

### Issue: 404 errors on API endpoints

**Solution**:
1. Verify Apache mod_rewrite is enabled in WAMP
2. Check `.htaccess` exists and is readable
3. Try accessing with full path: `http://localhost/MedooApi/api.php/auth/login`

## Folder Structure After Installation

```
MedooApi/
├── vendor/                 # Composer dependencies (created after install)
│   ├── catfan/
│   ├── firebase/
│   └── autoload.php
├── config/                 # Configuration files
├── controllers/            # Controller classes
├── functions/             # Function-based API
├── middleware/            # Middleware
├── utils/                 # Utility classes
├── .env                   # Environment variables (create from .env.example)
├── .env.example           # Example environment file
├── .htaccess             # Apache rewrite rules
├── api.php               # Main entry point (function-based)
├── index.php             # Alternative entry point (class-based)
├── composer.json         # Composer dependencies
└── composer.lock         # Locked versions (created after install)
```

## Development Workflow

1. Make changes to PHP files
2. Refresh browser (no build step needed)
3. Check errors in:
   - Browser console (frontend errors)
   - Apache error log: `C:\wamp64\logs\apache_error.log`
   - PHP error log: `C:\wamp64\logs\php_error.log`

## Production Deployment

See `PHP_DEPLOYMENT_GUIDE.md` for production deployment instructions.

## Next Steps

- Configure the two-database setup: See `TWO-DATABASE-SETUP.md`
- Test all API endpoints
- Configure React frontend to use the API
- Set up proper error logging
- Change JWT_SECRET to a secure random string

## Need Help?

- Check logs: `C:\wamp64\logs\`
- Verify PHP version: `php -v`
- Check loaded extensions: `php -m`
- Test database connection: `mysql -u root -p`
