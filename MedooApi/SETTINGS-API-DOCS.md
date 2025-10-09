# System Settings API Documentation

This document describes the System Settings API endpoints for managing global system configuration, daily shift settings, and company holidays.

## Base URL
All endpoints are prefixed with `/api/admin/settings`

## Authentication
All endpoints require admin authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## System Settings Endpoints

### Get All Settings (Combined)
Retrieves all settings including system configuration, daily shifts, and holidays for the current year.

**Endpoint:** `GET /api/admin/settings`

**Response:**
```json
{
  "success": true,
  "data": {
    "system_settings": {
      "pay_increment_minutes": 30,
      "pay_period_type": "bi-weekly",
      "pay_period_start_date": "2025-01-01",
      "default_lunch_duration": 60,
      "limit_start_time": false,
      "limit_end_time": false,
      "auto_clock_out_minutes": 60,
      "first_reminder_minutes": 15,
      "first_reminder_message": "Reminder: Please clock in...",
      "second_reminder_minutes": 60,
      "second_reminder_message": "First reminder: You haven't...",
      "auto_clock_out_message": "You were automatically..."
    },
    "daily_shifts": [...],
    "holidays": [...],
    "current_year": 2025
  }
}
```

---

### Get System Settings
Retrieves only system configuration settings.

**Endpoint:** `GET /api/admin/settings/system`

**Response:**
```json
{
  "success": true,
  "data": {
    "pay_increment_minutes": 30,
    "pay_period_type": "bi-weekly",
    "pay_period_start_date": "2025-01-01",
    "default_lunch_duration": 60,
    "limit_start_time": false,
    "limit_end_time": false,
    "auto_clock_out_minutes": 60,
    "first_reminder_minutes": 15,
    "first_reminder_message": "Reminder: Please clock in for your shift. Tap/Click to exit now.",
    "second_reminder_minutes": 60,
    "second_reminder_message": "First reminder: You haven't clocked-out yet. Please clock-out now or contact your supervisor.",
    "auto_clock_out_message": "You were automatically clocked-out at shift end with lunch deducted. Contact HR if incorrect."
  }
}
```

---

### Update System Settings
Updates system configuration settings.

**Endpoint:** `PUT /api/admin/settings/system`

**Request Body:**
```json
{
  "pay_increment_minutes": 30,
  "pay_period_type": "bi-weekly",
  "pay_period_start_date": "2025-01-01",
  "default_lunch_duration": 60,
  "limit_start_time": true,
  "limit_end_time": true,
  "auto_clock_out_minutes": 60,
  "first_reminder_minutes": 15,
  "first_reminder_message": "Custom reminder message",
  "second_reminder_minutes": 60,
  "second_reminder_message": "Custom second reminder",
  "auto_clock_out_message": "Custom auto clock-out message"
}
```

**Response:**
```json
{
  "success": true,
  "message": "System settings updated successfully"
}
```

---

## Daily Shift Settings Endpoints

### Get Daily Shifts
Retrieves shift settings for all days of the week.

**Endpoint:** `GET /api/admin/settings/daily-shifts`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "day_of_week": 0,
      "is_working_day": false,
      "start_time": null,
      "end_time": null,
      "lunch_required": false,
      "total_hours": 0,
      "created_at": "2025-01-01 00:00:00",
      "updated_at": "2025-01-01 00:00:00"
    },
    {
      "id": 2,
      "day_of_week": 1,
      "is_working_day": true,
      "start_time": "08:00:00",
      "end_time": "17:00:00",
      "lunch_required": true,
      "total_hours": 9.0,
      "created_at": "2025-01-01 00:00:00",
      "updated_at": "2025-01-01 00:00:00"
    }
  ]
}
```

**Day of Week Values:**
- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

---

### Update Single Daily Shift
Updates shift settings for a specific day.

**Endpoint:** `PUT /api/admin/settings/daily-shifts`

**Request Body:**
```json
{
  "day_of_week": 1,
  "is_working_day": true,
  "start_time": "08:00:00",
  "end_time": "17:00:00",
  "lunch_required": true,
  "total_hours": 9.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "day_of_week": 1,
    "is_working_day": true,
    "start_time": "08:00:00",
    "end_time": "17:00:00",
    "lunch_required": true,
    "total_hours": 9.0,
    "created_at": "2025-01-01 00:00:00",
    "updated_at": "2025-01-01 12:00:00"
  },
  "message": "Daily shift settings updated successfully"
}
```

---

### Bulk Update Daily Shifts
Updates shift settings for multiple days at once.

**Endpoint:** `PUT /api/admin/settings/daily-shifts/bulk`

**Request Body:**
```json
[
  {
    "day_of_week": 1,
    "is_working_day": true,
    "start_time": "08:00:00",
    "end_time": "17:00:00",
    "lunch_required": true,
    "total_hours": 9.0
  },
  {
    "day_of_week": 2,
    "is_working_day": true,
    "start_time": "08:00:00",
    "end_time": "17:00:00",
    "lunch_required": true,
    "total_hours": 9.0
  }
]
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "message": "Daily shift settings updated successfully"
}
```

---

## Holiday Management Endpoints

### Get Holidays
Retrieves holidays for a specific year.

**Endpoint:** `GET /api/admin/settings/holidays?year=2025`

**Query Parameters:**
- `year` (optional) - Year to retrieve holidays for. Defaults to current year.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "New Year's Day",
      "holiday_date": "2025-01-01",
      "year": 2025,
      "is_paid": true,
      "is_floating": false,
      "created_at": "2025-01-01 00:00:00",
      "updated_at": "2025-01-01 00:00:00"
    },
    {
      "id": 2,
      "name": "Memorial Day",
      "holiday_date": "2025-05-26",
      "year": 2025,
      "is_paid": true,
      "is_floating": false,
      "created_at": "2025-01-01 00:00:00",
      "updated_at": "2025-01-01 00:00:00"
    }
  ]
}
```

---

### Create Holiday
Creates a new holiday.

**Endpoint:** `POST /api/admin/settings/holidays`

**Request Body:**
```json
{
  "name": "Company Anniversary",
  "holiday_date": "2025-06-15",
  "year": 2025,
  "is_paid": true,
  "is_floating": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "name": "Company Anniversary",
    "holiday_date": "2025-06-15",
    "year": 2025,
    "is_paid": true,
    "is_floating": true,
    "created_at": "2025-01-15 12:00:00",
    "updated_at": "2025-01-15 12:00:00"
  },
  "message": "Holiday created successfully"
}
```

---

### Update Holiday
Updates an existing holiday.

**Endpoint:** `PUT /api/admin/settings/holidays`

**Request Body:**
```json
{
  "id": 7,
  "name": "Company Anniversary (Updated)",
  "holiday_date": "2025-06-16",
  "is_paid": false,
  "is_floating": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 7,
    "name": "Company Anniversary (Updated)",
    "holiday_date": "2025-06-16",
    "year": 2025,
    "is_paid": false,
    "is_floating": true,
    "created_at": "2025-01-15 12:00:00",
    "updated_at": "2025-01-15 13:00:00"
  },
  "message": "Holiday updated successfully"
}
```

---

### Delete Holiday
Deletes a holiday.

**Endpoint:** `DELETE /api/admin/settings/holidays`

**Request Body:**
```json
{
  "id": 7
}
```

**Response:**
```json
{
  "success": true,
  "message": "Holiday deleted successfully"
}
```

---

### Bulk Update Holidays
Updates multiple holidays at once (typically used for toggling is_paid status).

**Endpoint:** `PUT /api/admin/settings/holidays/bulk`

**Request Body:**
```json
{
  "year": 2025,
  "holidays": [
    {
      "id": 1,
      "is_paid": true,
      "holiday_date": "2025-01-01"
    },
    {
      "id": 2,
      "is_paid": false,
      "holiday_date": "2025-05-26"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "message": "Holidays updated successfully"
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (admin access required)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error

---

## Database Tables

### system_settings_timetrackpro
Stores key-value pairs for system configuration.

**Columns:**
- `id` - Primary key
- `setting_key` - Unique setting identifier
- `setting_value` - Setting value (stored as text)
- `setting_type` - Data type: string, number, boolean, json
- `description` - Setting description
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### daily_shift_settings_timetrackpro
Stores default shift configuration for each day of the week.

**Columns:**
- `id` - Primary key
- `day_of_week` - Day number (0=Sunday, 6=Saturday)
- `is_working_day` - Whether this is a working day
- `start_time` - Shift start time
- `end_time` - Shift end time
- `lunch_required` - Whether lunch break is required
- `total_hours` - Total shift length in hours
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### holidays_timetrackpro
Stores company holidays.

**Columns:**
- `id` - Primary key
- `name` - Holiday name
- `holiday_date` - Date of the holiday
- `year` - Year
- `is_paid` - Whether it's a paid holiday
- `is_floating` - Whether it's a floating/custom holiday
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

---

## Usage Examples

### Update System Settings
```bash
curl -X PUT https://your-domain.com/MedooApi/api.php?endpoint=/api/admin/settings/system \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pay_increment_minutes": 15,
    "limit_start_time": true,
    "limit_end_time": true,
    "auto_clock_out_minutes": 90
  }'
```

### Update Daily Shifts
```bash
curl -X PUT https://your-domain.com/MedooApi/api.php?endpoint=/api/admin/settings/daily-shifts/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "day_of_week": 1,
      "is_working_day": true,
      "start_time": "09:00:00",
      "end_time": "18:00:00",
      "lunch_required": true,
      "total_hours": 9.0
    }
  ]'
```

### Add Floating Holiday
```bash
curl -X POST https://your-domain.com/MedooApi/api.php?endpoint=/api/admin/settings/holidays \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Company Picnic Day",
    "holiday_date": "2025-08-15",
    "year": 2025,
    "is_paid": true,
    "is_floating": true
  }'
```
