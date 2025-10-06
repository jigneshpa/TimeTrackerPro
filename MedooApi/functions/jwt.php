<?php

use Firebase\JWT\JWT as FirebaseJWT;
use Firebase\JWT\Key;

function get_jwt_config() {
    static $config = null;

    if ($config === null) {
        $config = [
            'secret_key' => getenv('JWT_SECRET') ?: 'your-secret-key-change-in-production',
            'algorithm' => 'HS256',
            'expiration' => 86400,
        ];
    }

    return $config;
}

function jwt_encode($payload) {
    $config = get_jwt_config();
    $issuedAt = time();
    $expire = $issuedAt + $config['expiration'];

    $payload['iat'] = $issuedAt;
    $payload['exp'] = $expire;

    return FirebaseJWT::encode($payload, $config['secret_key'], $config['algorithm']);
}

function jwt_decode($token) {
    try {
        $config = get_jwt_config();
        $decoded = FirebaseJWT::decode($token, new Key($config['secret_key'], $config['algorithm']));
        return (array) $decoded;
    } catch (Exception $e) {
        return null;
    }
}

function get_token_from_header() {
    // Try multiple methods to get the Authorization header
    $authHeader = null;

    // Method 1: getallheaders()
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        } elseif (isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
        }
    }

    // Method 2: $_SERVER
    if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    // Method 3: Apache specific
    if (!$authHeader && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }

    // Method 4: Check for Bearer token directly in $_SERVER
    if (!$authHeader) {
        $headers = array();
        foreach ($_SERVER as $key => $value) {
            if (substr($key, 0, 5) === 'HTTP_') {
                $header = str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower(substr($key, 5)))));
                $headers[$header] = $value;
            }
        }
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        }
    }

    if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return $matches[1];
    }

    return null;
}
