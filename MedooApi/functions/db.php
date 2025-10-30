<?php

use Medoo\Medoo;

function get_db_connection()
{
    static $db = null;

    if ($db === null) {
        // --- Set PHP timezone for all date/time functions ---
        date_default_timezone_set('America/Chicago'); // Central Time (Tennessee)

        // --- Database configuration ---
        $config = [
            'type' => 'mysql',
            'host' => getenv('DB_HOST') ?: 'localhost',
            'database' => getenv('DB_NAME') ?: 'a1677kb8_gary',
            'username' => getenv('DB_USER') ?: 'a1677kb8_gary',
            'password' => getenv('DB_PASSWORD') ?: 'a1677kb8_gary',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'port' => getenv('DB_PORT') ?: 3306,

            'option' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],

            // Use a portable timezone offset instead of region name
            'command' => [
                'SET time_zone = "-06:00"' // Central Standard Time (safe)
            ],
        ];

        try {
            $db = new Medoo($config);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed: ' . $e->getMessage(),
                'errors' => null
            ]);
            exit;
        } catch (Exception $e) {
            error_log("Database connection error: " . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage(),
                'errors' => null
            ]);
            exit;
        }
    }

    return $db;
}

/*
use Medoo\Medoo;

function get_db_connection()
{
    static $db = null;

    if ($db === null) {
        // --- Set PHP timezone for all date/time functions ---
        date_default_timezone_set('America/Chicago'); // Central Time (Tennessee)

        // --- Database configuration ---
        $config = [
            'type' => 'mysql',
            'host' => getenv('DB_HOST') ?: 'localhost',
            'database' => getenv('DB_NAME') ?: 'kabba_admin',
            'username' => getenv('DB_USER') ?: 'kabba_admin',
            'password' => getenv('DB_PASSWORD') ?: 'Admin@7777',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'port' => getenv('DB_PORT') ?: 3306,

            'option' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],

            // Use a portable timezone offset instead of region name
            'command' => [
                'SET time_zone = "-06:00"' // Central Standard Time (safe)
            ],
        ];

        try {
            $db = new Medoo($config);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed: ' . $e->getMessage(),
                'errors' => null
            ]);
            exit;
        } catch (Exception $e) {
            error_log("Database connection error: " . $e->getMessage());
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage(),
                'errors' => null
            ]);
            exit;
        }
    }

    return $db;
}
*/