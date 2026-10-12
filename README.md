# KHA-IL-YAHN Gym — Hostinger Premium edition

This is a separate PHP/MySQL edition. It preserves the existing React interface and ports the API to PHP 8.2+. No Node.js server, Vercel, or Supabase is needed on Hostinger.

**To test on this computer first, open RUN-LOCALLY.html. To deploy, open START-HERE.html.** These are local guides; do not upload them.

## Deliverables

- `DOWNLOAD-Gym-Management-Hostinger.zip`: portable package to extract and test on another Windows computer. It contains no database data or private config.
- `UPLOAD-public_html.zip`: extract its contents directly into the domain's public_html.
- `UPLOAD-gym-private.zip`: extract one level ABOVE public_html; it creates gym-private.
- `database/schema.sql`: import once into a NEW empty database in phpMyAdmin.
- `server/config.example.php`: private server configuration template, also included in the private archive.
- `frontend/`, `server/`, `tools/`, `tests/`: editable source and verification tools. Do not upload this entire project.
- `VERIFICATION.md`: completed checks and remaining hosting acceptance checks.

The package contains no live records, usable credentials, session tokens, or development database. Your existing SQLite records/accounts are NOT automatically migrated. Password hashes differ; a deliberate data import and account reset workflow would be needed to move existing data.

## Hosting prerequisites

- PHP 8.2 or newer (use a supported version available in your account).
- PHP PDO MySQL, mbstring, GD and fileinfo enabled.
- MySQL 8+ or MariaDB 10.4+ with InnoDB.
- Apache/LiteSpeed .htaccess rewriting.
- HTTPS enabled; force HTTPS in hPanel.
- App installed at the ROOT of its domain or subdomain, not in /gym/.
- Permission to place gym-private next to public_html, outside the public document root.
- Enough PHP memory for images (256 MB recommended); JSON requests can reach 1.5 MB.

## Features preserved

Admin/Staff access, eight-hour sessions, five active sessions per account, staff account management and password resets, member registration/editing/photos, annual/monthly fees and previews, payment history, payment retry protection, QR creation/download, camera scanning and manual token entry, eligibility, cancellation/archiving, check-in logs, dashboard, revenue analytics, interaction/activity history, fee settings, branding, theme and responsive layout.

Payment records confirm cash/GCash/other payments received OUTSIDE the app. There is no payment gateway.

## Architecture and differences

The browser uses a static React bundle built with esbuild. Compatibility components replace Next.js navigation/image/dynamic components. Navigation uses normal full-page links, so Node/Next server functions are not required. PHP endpoints retain /api/... URLs and most response contracts.

MySQL InnoDB transactions and one application mutation lock serialize writes. This prioritizes payment correctness for a small single-gym deployment. Reports currently read matching history into PHP and member views query entitlements per member; no large-scale performance claims are made. Revisit database-side pagination/aggregation before using very large histories or many simultaneous staff sessions.

Node scrypt password hashing is replaced with PHP bcrypt over a SHA-256 prehash, avoiding bcrypt's 72-byte truncation. Sessions remain HttpOnly/SameSite with hashed tokens in the database. Password/role/status changes revoke sessions.

Arcjet is NOT carried over: it is a Node integration. This edition uses database-backed request/login throttling, exact configured Origin checking plus a custom JSON request header, prepared SQL, server-side roles, private config, secure production cookies, image re-encoding, and web-server security headers. Hostinger perimeter protection remains host-managed. It does not claim security certification or feature parity with Arcjet.

Only REMOTE_ADDR is used for rate limiting. If the host routes visitors through a shared proxy, limits may be shared; verify this with hosting support rather than blindly trusting forwarded headers. No MFA, email-based password recovery, external monitoring, or built-in automatic backups are added. Expired sessions are rejected immediately and pruned on login; individual SESSION_EXPIRED audit events from the Node edition are not emitted.

Image uploads are re-encoded to JPEG (PNG for logos), max dimension 512 px. Crop/orientation behavior may differ from the original Sharp pipeline. CSP allows inline style and the bundled theme initialization script; no third-party browser scripts are required.

## Source maintenance

The upload archives are already built. You do NOT need npm to deploy.

To modify the frontend on your own computer:
1. Install Node.js 24+.
2. Run `npm install` in this separate project.
3. Run `npm run typecheck`, then `npm run build`.
4. Run `powershell -ExecutionPolicy Bypass -File tools/package.ps1`.
5. Upload the newly generated website assets and changed private PHP files, preserving the production config.php.

Never reinstall schema.sql over a database with live data. Future database changes need versioned, reviewed migrations and a backup.

Run pure PHP business checks: `php tests/business.php`.
The API/browser suites are restricted to a DISPOSABLE localhost database named gym_hostinger_test. They create synthetic records and are not for production. See tests/README.md.

## Backup and recovery

Premium's hosting backup schedule is not a substitute for your chosen recovery target. At minimum, export the database after each business day (more frequently if needed), and keep encrypted copies outside Hostinger. Photos/logo are inside the database. Retain a copy of the matching code archive and private config securely. Keep backup files OUTSIDE public_html.

Use phpMyAdmin's Export (SQL, all tables, include structure and data). Stop staff writes while taking a manual export. Restore into a NEW staging database and verify record counts, payment totals, login and a member photo before relying on the procedure. Keep the original database until recovery is verified. Restoring an old database discards later transactions; reconcile payments before restoring production.

Keep at least two named administrator accounts for recovery. If all admins are locked out, recover through a trusted operator with database access; never reopen initial setup or add a publicly reachable password-reset script.

## Official hosting instructions

- Database creation/management: https://www.hostinger.com/support/mysql-databases/
- phpMyAdmin import: https://www.hostinger.com/support/1884149-how-to-import-a-database-with-phpmyadmin-in-hostinger/
- PHP configuration: https://www.hostinger.com/support/php/php-versions/

