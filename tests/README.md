# Local test notes

Deployment does not require Node.js or these test files.

- `business.php` checks date, eligibility, and password behavior without a database.
- `api.mjs` checks the PHP API against a disposable local MariaDB database.
- `browser.mjs` checks user workflows in a browser.
- `apache-smoke.mjs` validates the upload layout through local Apache.
- `router.php` is only for PHP's local development server.

The integration tests require the disposable database name `gym_hostinger_test` and create synthetic financial records. Never point them at production.
