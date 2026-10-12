@echo off
setlocal
cd /d "%~dp0"
set "PHP_EXE=C:\xampp\php\php.exe"

if not exist "%PHP_EXE%" (
  echo PHP was not found at %PHP_EXE%.
  echo Install XAMPP in C:\xampp or edit PHP_EXE in this file.
  pause
  exit /b 1
)

if not exist "server\config.php" (
  echo Missing server\config.php.
  echo Complete step 3 in RUN-LOCALLY.html first.
  pause
  exit /b 1
)

"%PHP_EXE%" -r "$required=['pdo_mysql','mbstring','gd','fileinfo'];foreach($required as $extension){if(!extension_loaded($extension)){fwrite(STDERR,'Missing PHP extension: '.$extension.PHP_EOL);exit(1);}}"
if errorlevel 1 (
  echo Enable the missing extension in C:\xampp\php\php.ini, then try again.
  pause
  exit /b 1
)

echo Starting Gym Management at http://127.0.0.1:8097
echo Keep this window open. Press Ctrl+C to stop the server.
"%PHP_EXE%" -S 127.0.0.1:8097 -t public_html tests/router.php
pause
