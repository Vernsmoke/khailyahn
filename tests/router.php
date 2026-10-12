<?php
// LOCAL PHP development server only. Never upload this router.
$root=dirname(__DIR__).'/public_html';
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if(str_starts_with($path,'/api/')){require dirname(__DIR__).'/server/app.php';return true;}
if(is_file($root.$path))return false;
header('Content-Type: text/html; charset=utf-8');
readfile($root.'/index.html');

