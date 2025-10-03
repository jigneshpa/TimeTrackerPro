# Two-Database Setup Guide

This guide explains how the Node.js API works with two separate MySQL databases.

## Architecture Overview

The application now uses **two separate databases**:

### Database A (Laravel Users Database)
- **Purpose**: User authentication
- **Table**: `users`
- **Fields**: `id`, `email`, `password`, `name`, `created_at`, `updated_at`
- **Used for**: Login authentication only

### Database B (Time Tracking Database)
- **Purpose**: Time tracking and employee management
- **Tables**: `employees`, `time_entries`, `vacation_requests`, `work_schedules`
- **Used for**: All application data except authentication

## How It Works

### Authentication Flow

1. **User logs in** with email and password
2. **DatabaseA** is queried to validate credentials from `users` table
3. If valid, **DatabaseB** is checked for matching employee record
4. If no employee exists in DatabaseB, one is **automatically created**
5. JWT token is generated with employee data from DatabaseB
6. All subsequent requests use employee data from DatabaseB

### Registration Flow

1. **User registers** with email, password, and details
2. User is created in **DatabaseA** (`users` table)
3. Employee record is created in **DatabaseB** (`employees` table)
4. JWT token is generated

### Data Sync

- Email is the **linking field** between both databases
- Employee records in DatabaseB are automatically created on first login
- Admin operations that create employees will create users in both databases

## Configuration

### Environment Variables

Edit `.env` file in `NodeApi/`:

```env
# Database A - Laravel Users Database
DBA_HOST=localhost
DBA_PORT=3306
DBA_NAME=database_a
DBA_USER=root
DBA_PASSWORD=your_password

# Database B - Time Tracking Database
DBB_HOST=localhost
DBB_PORT=3306
DBB_NAME=time_tracking
DBB_USER=root
DBB_PASSWORD=your_password
```

### Database Structure

**Database A Schema (users table):**
```sql
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Database B Schema:**
Use the existing schema from `database/mysql-schema.sql`

## Code Implementation

### Database Connection (`config/database.js`)

```javascript
import mysql from 'mysql2/promise';

const dbA = mysql.createPool({
  host: process.env.DBA_HOST,
  database: process.env.DBA_NAME,
  // ... config for Database A
});

const dbB = mysql.createPool({
  host: process.env.DBB_HOST,
  database: process.env.DBB_NAME,
  // ... config for Database B
});

export { dbA, dbB };
```

### Login Flow (`routes/auth.js`)

```javascript
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Check DatabaseA for authentication
  const [users] = await dbA.query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  // 2. Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  // 3. Get or create employee in DatabaseB
  const [employees] = await dbB.query(
    'SELECT * FROM employees WHERE email = ?',
    [email]
  );

  // 4. Auto-create employee if doesn't exist
  if (employees.length === 0) {
    await dbB.query(
      'INSERT INTO employees (email, first_name, last_name, role) VALUES (?, ?, ?, ?)',
      [email, user.name, '', 'employee']
    );
  }

  // 5. Generate JWT with employee data
  const token = generateToken({
    user_id: employee.id,
    email: employee.email,
    role: employee.role
  });
});
```

### Data Operations

All data operations use **DatabaseB**:

```javascript
// Time Clock
await dbB.query('INSERT INTO time_entries ...');

// Vacation
await dbB.query('SELECT * FROM vacation_requests ...');

// Employees
await dbB.query('SELECT * FROM employees ...');

// Work Schedules
await dbB.query('SELECT * FROM work_schedules ...');
```

### Admin Creating Employees

When admin creates an employee, both databases are updated:

```javascript
router.post('/employees', requireAdmin, async (req, res) => {
  // 1. Create user in DatabaseA
  await dbA.query(
    'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
    [email, passwordHash, `${first_name} ${last_name}`]
  );

  // 2. Create employee in DatabaseB
  await dbB.query(
    'INSERT INTO employees (email, first_name, last_name, ...) VALUES (...)',
    [email, first_name, last_name, ...]
  );
});
```

## Benefits of Two-Database Setup

1. **Separation of Concerns**
   - Authentication logic separate from business logic
   - Can use Laravel for user management
   - Can use Node.js for time tracking features

2. **Flexibility**
   - Can switch authentication systems without affecting data
   - Can maintain existing Laravel users
   - Can scale databases independently

3. **Security**
   - User credentials isolated in separate database
   - Can apply different security policies to each database
   - Easier to audit authentication logs

## Setup Steps

### 1. Create Database A

```sql
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

### 2. Create Database B

```bash
mysql -u root -p < database/mysql-schema.sql
```

Or create manually and import the time tracking tables.

### 3. Configure Environment

```bash
cd NodeApi
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start Server

```bash
npm run dev
```

## Testing the Setup

### Test with existing Laravel user:

```bash
# Login with Laravel user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

The API will:
1. Authenticate against DatabaseA
2. Auto-create employee in DatabaseB if needed
3. Return JWT token

### Test new registration:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newuser@example.com",
    "password":"password123",
    "first_name":"John",
    "last_name":"Doe"
  }'
```

This creates:
- User in DatabaseA
- Employee in DatabaseB

## Migration from Single Database

If you're migrating from a single database setup:

1. **Export existing users:**
```sql
SELECT email, password_hash as password,
       CONCAT(first_name, ' ', last_name) as name,
       created_at, updated_at
FROM employees;
```

2. **Import into DatabaseA users table**

3. **Update .env** with both database configurations

4. **Restart Node.js server**

## Troubleshooting

### Connection Errors

Check both database connections:

```javascript
// Test connections
dbA.query('SELECT 1').then(() => console.log('DatabaseA connected'));
dbB.query('SELECT 1').then(() => console.log('DatabaseB connected'));
```

### User Not Found

- Verify user exists in DatabaseA `users` table
- Check email spelling matches exactly
- Verify password is bcrypt hashed in DatabaseA

### Employee Auto-Creation Failed

- Check DatabaseB permissions
- Verify `employees` table exists
- Check for email unique constraint conflicts

### Password Not Matching

- Laravel uses bcrypt by default
- Node.js bcryptjs should match Laravel hashes
- Verify password hashing cost matches (default: 10)

## Important Notes

1. **Email is the primary link** between databases
2. **Employee auto-creation** happens on first login from DatabaseA
3. **Admin operations** update both databases when creating users
4. **JWT tokens** use employee ID from DatabaseB
5. **All business data** stays in DatabaseB only

## Security Considerations

- Keep database credentials secure
- Use different users with appropriate permissions for each database
- DatabaseA user only needs SELECT for authentication
- DatabaseB user needs full CRUD permissions
- Consider read replicas for DatabaseA if scaling
- Regular backups of both databases

## Performance Optimization

- Connection pooling is enabled for both databases
- Auto-creation of employees is cached after first login
- Consider adding email index in both databases
- Monitor slow queries on both databases independently
