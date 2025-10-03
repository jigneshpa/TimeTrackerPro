# MedooAPI - Function-Based Approach

This is a function-based implementation of the MedooAPI, converted from the class-based approach. All functionality remains the same, but the code is now organized using plain PHP functions instead of classes.

## File Structure

```
MedooApi/
├── api.php                    # Main entry point (replaces index.php)
├── functions/
│   ├── db.php                # Database connection function
│   ├── response.php          # Response helper functions
│   ├── jwt.php               # JWT encoding/decoding functions
│   ├── auth.php              # Authentication functions
│   ├── cors.php              # CORS handling function
│   ├── timeclock.php         # Time clock endpoint handlers
│   ├── vacation.php          # Vacation endpoint handlers
│   └── admin.php             # Admin endpoint handlers
├── config/
│   ├── database.php          # Database configuration (still used by class-based)
│   └── jwt.php               # JWT configuration (still used by class-based)
├── controllers/              # Old class-based controllers (can be removed)
├── middleware/               # Old class-based middleware (can be removed)
└── utils/                    # Old class-based utils (can be removed)
```

## Usage

### Option 1: Use the new function-based API

Point your web server or .htaccess to `api.php` instead of `index.php`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ api.php [QSA,L]
```

### Option 2: Replace index.php

You can also rename or replace `index.php` with `api.php` if you want to keep the same entry point.

## Key Changes

### From Classes to Functions

**Before (Class-based):**
```php
namespace Api\Controllers;

class AuthController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function login() {
        // login logic
    }
}
```

**After (Function-based):**
```php
function handle_login() {
    $db = get_db_connection();
    // login logic
}
```

### Function Naming Convention

All handler functions follow the pattern: `handle_{action_name}()`
- `handle_login()`
- `handle_clock_in()`
- `handle_get_employees()`

Helper functions follow descriptive naming:
- `get_db_connection()`
- `send_success_response()`
- `authenticate_user()`
- `jwt_encode()`

### No Namespaces or Autoloading

The function-based approach doesn't use PHP namespaces or autoloading. All functions are loaded via `require_once` statements in `api.php`.

## Benefits of Function-Based Approach

1. **Simpler**: No need to understand OOP concepts, namespaces, or autoloading
2. **Direct**: Functions are called directly without instantiating objects
3. **Easy to debug**: Straightforward execution flow
4. **Lightweight**: No class overhead or dependency injection
5. **Beginner-friendly**: More accessible for developers new to PHP

## Endpoints

All endpoints remain the same as the class-based version:

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

## Configuration

Uses the same `.env` file as the class-based version. No changes needed.

## Dependencies

Still uses the same Composer dependencies:
- Medoo (database)
- Firebase JWT

Run `composer install` if you haven't already.
