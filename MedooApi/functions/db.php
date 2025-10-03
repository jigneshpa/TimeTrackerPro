<?php

use Medoo\Medoo;

function get_db_connection_a() {
    static $dbA = null;

    if ($dbA === null) {
        $config = [
            'type' => 'mysql',
            'host' => getenv('DBA_HOST') ?: 'localhost',
            'database' => getenv('DBA_NAME') ?: 'database_a',
            'username' => getenv('DBA_USER') ?: 'root',
            'password' => getenv('DBA_PASSWORD') ?: '',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'port' => getenv('DBA_PORT') ?: 3306,
            'option' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        ];

        $dbA = new Medoo($config);
    }

    return $dbA;
}

function get_db_connection_b() {
    static $dbB = null;

    if ($dbB === null) {
        $config = [
            'type' => 'mysql',
            'host' => getenv('DBB_HOST') ?: 'localhost',
            'database' => getenv('DBB_NAME') ?: 'time_tracking',
            'username' => getenv('DBB_USER') ?: 'root',
            'password' => getenv('DBB_PASSWORD') ?: '',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'port' => getenv('DBB_PORT') ?: 3306,
            'option' => [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        ];

        $dbB = new Medoo($config);
    }

    return $dbB;
}

function get_db_connection() {
    return get_db_connection_b();
}
