<?php

use Medoo\Medoo;

function get_db_connection() {
    static $db = null;

    if ($db === null) {
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
            ]
        ];

        $db = new Medoo($config);
    }

    return $db;
}
