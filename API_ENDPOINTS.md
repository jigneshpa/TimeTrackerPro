# API Endpoints Reference

This document lists all API endpoints used in the React application and where they are called.

## Base Configuration

**API Base URL**: `http://localhost/MedooApi/api.php`
**Location**: `src/lib/api.ts` (line 1)

## Authentication Endpoints

### 1. Login
- **Function**: `login(email, password)`
- **Endpoint**: `/api/auth/login`
- **Method**: `POST`
- **Location**: `src/lib/api.ts` (lines 56-62)
- **Used in**: `src/contexts/AuthContext.tsx` (line 75)
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "jwt_token_here",
      "user": {
        "id": 1,
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "role": "admin",
        "roles": [
          {
            "id": 1,
            "name": "Master Admin",
            "short_name": "master_admin",
            "color": "#ef4444"
          }
        ]
      }
    }
  }
  ```
- **Full URL**: `http://localhost/MedooApi/api.php?endpoint=/api/auth/login`

### 2. Get Current User (Me)
- **Function**: `getAuthMe()`
- **Endpoint**: `/api/auth/me`
- **Method**: `GET`
- **Location**: `src/lib/api.ts` (lines 65-68)
- **Used in**: `src/contexts/AuthContext.tsx` (line 48)
- **Headers**: `Authorization: Bearer {token}`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "admin"
    }
  }
  ```
- **Full URL**: `http://localhost/MedooApi/api.php?endpoint=/api/auth/me`

## Time Clock Endpoints

### 3. Get Active Time Entry
- **Function**: `getActiveTimeClock()`
- **Endpoint**: `/api/timeclock/active`
- **Method**: `GET`
- **Location**: `src/lib/api.ts` (lines 70-73)
- **Used in**: `src/contexts/TimeClockContext.tsx` (line 53)
- **Headers**: `Authorization: Bearer {token}`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": 123,
      "employee_id": 1,
      "clock_in": "2024-10-06 09:00:00",
      "clock_out": null,
      "status": "active"
    }
  }
  ```
- **Full URL**: `http://localhost/MedooApi/api.php?endpoint=/api/timeclock/active`

### 4. Get Today's Time Entries
- **Function**: `getTodayTimeEntries()`
- **Endpoint**: `/api/timeclock/today`
- **Method**: `GET`
- **Location**: `src/lib/api.ts` (lines 75-78)
- **Used in**: `src/contexts/TimeClockContext.tsx` (line 67)
- **Headers**: `Authorization: Bearer {token}`
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 123,
        "employee_id": 1,
        "clock_in": "2024-10-06 09:00:00",
        "clock_out": "2024-10-06 17:00:00",
        "break_duration": 30,
        "total_hours": 7.5,
        "status": "completed"
      }
    ]
  }
  ```
- **Full URL**: `http://localhost/MedooApi/api.php?endpoint=/api/timeclock/today`

### 5. Clock In
- **Function**: `clockIn(notes?)`
- **Endpoint**: `/api/timeclock/clock-in`
- **Method**: `POST`
- **Location**: `src/lib/api.ts` (lines 80-83)
- **Used in**: `src/contexts/TimeClockContext.tsx` (line 80)
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "notes": "Starting work on project X"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Clocked in successfully",
    "data": {
      "id": 124,
      "employee_id": 1,
      "clock_in": "2024-10-06 09:00:00",
      "status": "active"
    }
  }
  ```
- **Full URL**: `http://localhost/MedooApi/api.php?endpoint=/api/timeclock/clock-in`

### 6. Clock Out
- **Function**: `clockOut(breakDuration?)`
- **Endpoint**: `/api/timeclock/clock-out`
- **Method**: `POST`
- **Location**: `src/lib/api.ts` (lines 85-92)
- **Used in**: `src/contexts/TimeClockContext.tsx` (line 95)
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```json
  {
    "break_duration": 30
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Clocked out successfully",
    "data": {
      "id": 124,
      "employee_id": 1,
      "clock_in": "2024-10-06 09:00:00",
      "clock_out": "2024-10-06 17:00:00",
      "total_hours": 7.5,
      "status": "completed"
    }
  }
  ```
- **Full URL**: `http://localhost/MedooApi/api.php?endpoint=/api/timeclock/clock-out`

## API Usage Pattern

All API calls follow this pattern:

1. **Import the function**:
   ```typescript
   import { login, getAuthMe, clockIn } from '../lib/api';
   ```

2. **Call the function**:
   ```typescript
   const response = await login('user@example.com', 'password');
   ```

3. **Handle the response**:
   ```typescript
   if (response.success) {
     // Use response.data
   }
   ```

## Authentication Flow

1. User calls `login(email, password)` from `LoginPage.tsx`
2. Token is returned and stored via `setToken(token)`
3. Token is automatically included in all subsequent API calls via the `Authorization` header
4. On page refresh, `getAuthMe()` is called to restore the session

## Error Handling

All API functions throw errors if the request fails. Use try-catch blocks:

```typescript
try {
  await clockIn('Starting work');
} catch (error) {
  console.error('Clock in failed:', error.message);
}
```

## Changing the API URL

To use a different API server, update line 1 in `src/lib/api.ts`:

```typescript
const API_BASE = 'https://your-server.com/api/endpoint.php';
```
