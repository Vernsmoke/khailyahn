# Verification record

Prepared 12 October 2026 for the separate Hostinger Premium PHP/MySQL edition.

## Passed locally

- PHP syntax: every private PHP file passes PHP 8.2 syntax checks.
- Frontend: TypeScript checks and the production build pass.
- Business rules: 22 checks pass, covering month ends, leap years, annual grace, monthly expiry, cancellation, archived/unknown entry, Manila dates, long passwords, malformed session cookies, and renewal baselines.
- API: 83 assertions pass against a disposable MariaDB 10.4 database. These cover single-use administrator setup, authentication, permissions, registration, photos, payments, retry safety, stale prices, rollback, QR entry, cancellation, archiving, session revocation, fee/branding settings, interaction receipts, and login throttling.
- Browser: 21 workflow checks pass in Edge. Every Admin module renders; registration, denied/approved QR entry, monthly renewal, member profiles, mobile layout, and Staff restrictions work.
- Apache package: 19 checks pass using the final public/private folder layout. Routes, rewrites, blocked private paths, security headers, login, bundled font, theme, and refresh behavior work.
- Deployment review: every table declares the same UTF-8 collation so foreign keys do not depend on the database default, and the private PHP archive denies web requests if it is accidentally extracted inside a public directory.
- Portable Windows package: required local server, schema, router, guides, and deployment archives are present; live `config.php`, database data, dependencies, and Git metadata are excluded.

All integration records were synthetic and used only the disposable database `gym_hostinger_test`. That database and its configuration are excluded from delivery. The existing Gym Management database was not read or changed.

## Must still be verified on Hostinger

- Account PHP/MariaDB versions, required extensions, and permission to keep `gym-private` outside `public_html`.
- Hostinger rewrite/header behavior, DNS, HTTPS, forced HTTPS, and canonical www/non-www redirects.
- Whether `REMOTE_ADDR` identifies individual visitors or a shared proxy.
- The actual gym camera/browser, printed QR codes, concurrent staff use, storage growth, and performance.
- Monitoring, backup schedule, and a demonstrated restore into a separate database.
- Privacy, retention, operational ownership, and production launch approval.
- Migration of any existing SQLite records. This package starts with an empty database.

Use a separate staging database for acceptance testing so synthetic payments never enter the production ledger.
