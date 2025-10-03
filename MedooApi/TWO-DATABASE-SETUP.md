# MedooAPI Two-Database Setup Guide

This guide explains how the PHP MedooAPI now works with two separate MySQL databases.

## Architecture Overview

The MedooAPI uses **two separate databases**:

### Database A (Laravel Users Database)
- **Purpose**: User authentication
- **Table**: `users`
- **Fields**: `id`, `email`, `password`, `name`, `created_at`, `updated_at`
- **Used for**: Login authentication only

### Database B (Time Tracking Database)
- **Purpose**: Time tracking and employee management
- **Tables**: `employees`, `time_entries`, `vacation_requests`, `work_schedules`
- **Used for**: All application data except authentication

## Configuration

### Environment Variables

Create or update `.env` file in `MedooApi/`:

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

## Database Connection Functions

Three connection functions are available:

```php
// Get Database A connection (Laravel users)
$dbA = get_db_connection_a();

// Get Database B connection (Time tracking)
$dbB = get_db_connection_b();

// Get default connection (returns Database B)
$db = get_db_connection();
```

## Authentication Flow

### Login (`handle_login()`)

1. Receives email and password from request
2. Queries **DatabaseA** `users` table for authentication
3. Verifies password using `password_verify()`
4. Checks **DatabaseB** for existing employee record
5. If no employee exists, **auto-creates** one in DatabaseB
6. Generates JWT token with employee data
7. Returns token and employee information

```php
function handle_login() {
    // Authenticate against DatabaseA
    $dbA = get_db_connection_a();
    $user = $dbA->get('users', '*', ['email' => $email]);

    // Verify password
    if (!password_verify($password, $user['password'])) {
        send_error_response('Invalid credentials', 401);
    }

    // Get or create employee in DatabaseB
    $dbB = get_db_connection_b();
    $employee = $dbB->get('employees', '*', ['email' => $email]);

    if (!$employee) {
        // Auto-create employee
        $dbB->insert('employees', [
            'email' => $email,
            'first_name' => $user['name'],
            'role' => 'employee'
        ]);
    }

    // Generate JWT
    $token = jwt_encode([
        'user_id' => $employee['id'],
        'email' => $employee['email'],
        'role' => $employee['role']
    ]);
}
```

### Registration (`handle_register()`)

1. Validates required fields
2. Creates user in **DatabaseA** `users` table
3. Creates employee in **DatabaseB** `employees` table
4. Generates JWT token
5. Returns token and employee data

```php
function handle_register() {
    $dbA = get_db_connection_a();
    $dbA->insert('users', [
        'email' => $email,
        'password' => $passwordHash,
        'name' => $firstName . ' ' . $lastName
    ]);

    $dbB = get_db_connection_b();
    $dbB->insert('employees', [
        'email' => $email,
        'first_name' => $firstName,
        'last_name' => $lastName,
        // ... other fields
    ]);
}
```

### Token Verification (`authenticate_user()`)

Uses **DatabaseB** only for fetching employee data:

```php
function authenticate_user() {
    $payload = jwt_decode($token);

    $dbB = get_db_connection_b();
    $employee = $dbB->get('employees', '*', [
        'id' => $payload['user_id'],
        'is_active' => true
    ]);

    return $employee;
}
```

## Data Operations

### Time Clock Functions (`timeclock.php`)

All time clock operations use **DatabaseB**:

```php
// Uses get_db_connection() which returns DatabaseB
$db = get_db_connection();
$db->insert('time_entries', [...]);
$db->select('time_entries', '*', [...]);
```

### Vacation Functions (`vacation.php`)

All vacation operations use **DatabaseB**:

```php
$db = get_db_connection();
$db->select('vacation_requests', '*', [...]);
$db->update('vacation_requests', [...]);
```

### Admin Functions (`admin.php`)

Most admin operations use **DatabaseB**, except employee creation which uses both:

```php
function handle_create_employee() {
    // Check DatabaseA for existing user
    $dbA = get_db_connection_a();
    $existingUser = $dbA->get('users', 'id', ['email' => $email]);

    // Check DatabaseB for existing employee
    $dbB = get_db_connection_b();
    $existingEmployee = $dbB->get('employees', 'id', ['email' => $email]);

    // Create in both databases
    $dbA->insert('users', [...]);
    $dbB->insert('employees', [...]);
}
```

## API Endpoints

All endpoints remain unchanged:

### Authentication
- `POST /api/auth/login` - Login (uses DatabaseA + DatabaseB)
- `POST /api/auth/register` - Register (uses both databases)
- `GET /api/auth/me` - Get current user (uses DatabaseB)

### Time Clock
- All endpoints use **DatabaseB** only

### Vacation
- All endpoints use **DatabaseB** only

### Admin
- Most endpoints use **DatabaseB**
- Employee creation uses **both databases**

## Database Schema

### Database A Schema

```sql
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
```

### Database B Schema

Use the existing schema from `database/mysql-schema.sql`

## Setup Steps

### 1. Create Database A

```bash
mysql -u root -p

CREATE DATABASE database_a;
USE database_a;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. Verify Database B Exists

```bash
mysql -u root -p -e "USE time_tracking; SHOW TABLES;"
```

### 3. Configure Environment

```bash
cd MedooApi
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Install Dependencies

```bash
composer install
```

### 5. Start PHP Server

```bash
php -S localhost:8000
```

Or use Apache/Nginx with the MedooApi directory.

## Testing

### Test Login with Laravel User

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Expected behavior:
1. Authenticates against DatabaseA
2. Auto-creates employee in DatabaseB if needed
3. Returns JWT token

### Test Registration

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newuser@example.com",
    "password":"password123",
    "first_name":"John",
    "last_name":"Doe"
  }'
```

Creates user in both databases.

## Migrating from Single Database

If you have existing users in the `employees` table:

### 1. Extract Users from Employees

```sql
INSERT INTO database_a.users (email, password, name, created_at, updated_at)
SELECT
  email,
  password_hash as password,
  CONCAT(first_name, ' ', last_name) as name,
  created_at,
  updated_at
FROM time_tracking.employees;
```

### 2. Remove Password Hash from Employees (Optional)

Since passwords are now in DatabaseA, you can remove them from DatabaseB:

```sql
ALTER TABLE time_tracking.employees DROP COLUMN password_hash;
```

### 3. Update .env Configuration

Update your `.env` file with both database credentials.

### 4. Test the Integration

Test login with existing users to ensure they work correctly.

## Advantages

1. **Separation of Concerns**
   - Authentication isolated from business logic
   - Can maintain Laravel users separately
   - Can use different security policies

2. **Flexibility**
   - Can switch auth systems without affecting data
   - Can scale databases independently
   - Easier integration with existing Laravel apps

3. **Security**
   - Credentials isolated in separate database
   - Different access permissions per database
   - Easier to audit authentication logs

## Troubleshooting

### Connection Errors

Test both database connections:

```php
try {
    $dbA = get_db_connection_a();
    echo "DatabaseA connected\n";

    $dbB = get_db_connection_b();
    echo "DatabaseB connected\n";
} catch (Exception $e) {
    echo "Connection error: " . $e->getMessage();
}
```

### User Not Found

- Verify user exists in DatabaseA `users` table
- Check email spelling matches exactly
- Verify password is bcrypt hashed

### Employee Auto-Creation Failed

- Check DatabaseB permissions
- Verify `employees` table exists
- Check for unique email constraint

### Password Mismatch

- Verify password is hashed with bcrypt
- Laravel uses `PASSWORD_BCRYPT` by default
- PHP's `password_verify()` should match Laravel hashes

## Important Notes

1. **Email is the link** between both databases
2. **Auto-creation** happens on first login from DatabaseA
3. **Admin operations** update both databases when creating users
4. **JWT tokens** use employee ID from DatabaseB
5. **All business data** stays in DatabaseB only
6. **get_db_connection()** defaults to DatabaseB for backward compatibility

## Performance Tips

- Add index on `email` in both databases
- Use connection pooling if available
- Monitor slow queries on both databases
- Consider caching employee lookups after authentication
- Regular backups of both databases

## Security Best Practices

- Use different database users with appropriate permissions
- DatabaseA user only needs SELECT for authentication
- DatabaseB user needs full CRUD permissions
- Store database credentials securely
- Use HTTPS in production
- Implement rate limiting on login endpoint
