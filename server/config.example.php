<?php
// Copy to config.php in the SAME PRIVATE folder, outside public_html.
// Do not put secrets in frontend files or upload this folder inside public_html.
return [
 'db_host' => 'localhost',
 'db_port' => 3306,
 'db_name' => 'REPLACE_WITH_HOSTINGER_DATABASE_NAME',
 'db_user' => 'REPLACE_WITH_HOSTINGER_DATABASE_USER',
 'db_password' => 'REPLACE_WITH_DATABASE_PASSWORD',
 'app_origin' => 'https://khailyahn.online',
 'cookie_secure' => true,
 // Generate at least 32 random characters in a password manager. Blank disables setup.
 'setup_token' => '',
];

