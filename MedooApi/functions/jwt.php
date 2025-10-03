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
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
    }
    return null;
}
