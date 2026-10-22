# Backend API

## Run locally

1. Start SQL Server from the repository root:

   ```powershell
   docker.exe compose up -d sqlserver
   ```

   On some Windows installations, typing `docker` opens an app-selection dialog
   because `C:\Windows\System32\docker` shadows Docker Desktop's CLI. Use
   `docker.exe` in PowerShell instead. Confirm the engine and SQL Server are ready
   with `docker.exe version` and `docker.exe compose ps`.

2. Copy `.env.example` to `.env`. `DATABASE_URL` and `MSSQL_SA_PASSWORD` must use the same SQL Server password.

3. Install dependencies and apply the Prisma migration:

   ```powershell
   cd Backend
   npm install
   npx prisma migrate deploy
   npm run start:dev
   ```

The API runs at `http://localhost:3000`.

## First Postman checks

### Health

`GET http://localhost:3000/health`

Expected response:

```json
{"status":"ok","database":"connected"}
```

### Register

`POST http://localhost:3000/auth/register`

Body, raw JSON:

```json
{
  "username": "reader01",
  "email": "reader01@example.com",
  "password": "Password123"
}
```

### Login

`POST http://localhost:3000/auth/login`

Body, raw JSON:

```json
{
  "usernameOrEmail": "reader01",
  "password": "Password123"
}
```

Copy `accessToken` from the response and send it as `Authorization: Bearer <accessToken>` for guarded services.

## SePay coin deposits

1. Set `SEPAY_WEBHOOK_API_KEY` in `.env` to the API key configured for the SePay webhook.
2. Sign in as an Admin and configure the receiving bank account:

   `PATCH /admin/payment-settings`

   ```json
   {
     "bankName": "Vietcombank",
     "bankBin": "970436",
     "bankAccountNumber": "0123456789",
     "bankAccountName": "NGUYEN VAN A"
   }
   ```

3. Configure SePay to send incoming bank-transaction webhooks to `POST /payments/webhook/sepay`
   with the `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>` header.
   The API key must be set to the same secret in `Backend/.env` and in SePay's
   webhook security settings. Restart the backend after changing the environment
   variable. Do not expose or commit this key.
   SePay must be able to reach the backend over the public internet; `localhost`
   and a private Docker/network address will not work. For local testing, expose
   the backend through a secure HTTPS tunnel and use that public URL in SePay.
   Use SePay's test-webhook feature and webhook log to verify the endpoint returns
   HTTP 200 with `{"success":true}`.
4. An authenticated user creates a deposit using `POST /payments/deposits` with
   `{"amountVnd": 50000}`. The backend returns a VietQR image URL and a unique
   transfer code. Deposit amounts must be multiples of 1,000 VND.
5. The user can poll `GET /payments/:id` for status. A valid incoming webhook
   credits coins from the amount actually received (1 coin per 1,000 VND), even if
   it is less or more than requested. The received amount must be a multiple of
   1,000 VND; otherwise it is recorded as `NeedsReview` and does not credit coins.
   Replayed SePay transaction IDs do not credit coins twice.

The backend stores bank account settings in `SystemSetting`; the SePay API key is
kept in the environment and is never returned by the settings API. Expired pending
orders are reported as expired but are still accepted if a matching transfer arrives.
When a SePay payload includes `accountNumber`, it must match the receiving account
stored on the matched deposit order or the transaction is marked `WrongAccount`.

Admins can review pending deposits with `GET /admin/payments/orders?page=1&limit=20`
and incoming bank transactions with
`GET /admin/payments/bank-transactions?page=1&limit=20`. The bank-transaction
endpoint includes unmatched, review-required, wrong-account, and already-paid
transactions. An unmatched incoming transaction can be linked to a pending order
with `PATCH /admin/payments/bank-transactions/:id/assign`, including a required
reason. If no webhook transaction was recorded, an Admin can confirm a pending
order with `POST /admin/payments/orders/:id/confirm`, providing the bank statement
transaction ID, amount actually received, and reason. Both Admin actions share
the same atomic order, wallet, ledger, and bank-transaction update logic as the
SePay webhook. The supplied bank transaction ID is unique, preventing a later
webhook for that same transfer from crediting the wallet again.

## Content pricing and community translations

Authors and verified Publishers can set `pricingType`, `priceCoins`, and
`freeChapters` when creating or updating their content. Pricing values are
`free` and `paid`; paid content must have a positive integer coin price, while
free content is always stored at zero coins. `freeChapters` defaults to 3.

Example fields in an Author/Publisher content request:

```json
{
  "pricingType": "paid",
  "priceCoins": 50,
  "freeChapters": 3,
  "allowCommunityTranslation": false
}
```

When `pricingType` is `free`, the backend stores `priceCoins` as zero. The
Author/Publisher chooses the catalogue price in coins; purchase requests always
use this server-stored price.

Fan Translations are always stored as free with a zero price. They can only be
created from a published Licensed title when its Publisher has enabled
`allowCommunityTranslation` while the title is free. Only Licensed titles can
enable this option; switching a title to paid automatically disables it.
Existing Fan Translations stay public for 14 days after the title changes to
paid, then disappear from public content, ranking, manga-page, and novel-reading
endpoints. Authors can update these fields through their existing
`PATCH /author/content/:id` endpoint, and Publishers through
`PATCH /publisher/content/:id`.

## Buying and reading paid content

An authenticated reader can check ownership with `GET /unlock/content/:contentId`
and buy a published paid title with `POST /unlock/content/:contentId/purchase`.
The server charges the current `priceCoins` once and records the purchase and
wallet ledger entry in the same database transaction. Repeating a purchase
request for a title already owned does not charge again.

The first `freeChapters` chapters of a paid title are readable without purchase.
Reading a later chapter requires login and ownership. One purchase unlocks all
current and future chapters of that title, even if its price changes later.
Free titles and Fan Translations remain readable without purchase. Public
chapter-reading endpoints accept an optional Bearer token so anonymous readers
can still access free chapters.

## Wallet

Authenticated users can check their coin balance with `GET /wallet/balance` and
their paginated coin ledger with `GET /wallet/transactions?page=1&limit=20`.
The transaction endpoint returns `items`, `page`, `limit`, `total`, and
`totalPages`; `limit` is capped at 100. A user without a wallet yet has a balance
of zero and an empty transaction history. Both endpoints are scoped to the user
identified by the JWT.

## Creator revenue and payouts

When a paid `Original` title is purchased, the uploader receives 60% of the
sale in creator earnings. When a paid `Licensed` title is purchased, its
verified Publisher receives 80%. The creator share is rounded down to a whole
coin; the remaining coins are recorded as the platform share. The revenue
allocation is committed in the same transaction as the buyer debit, purchase,
and wallet ledger entry.

Authors and Publishers can view their earnings at `GET /revenue/me` and
paginated sale history at `GET /revenue/me/history?page=1&limit=20`.
These endpoints only return revenue belonging to the authenticated creator.

Creators save or update their payout bank profile with `PUT /payout/profile`
and view it with `GET /payout/profile`. `POST /payout/requests` creates a payout
request for at least the configured `payout.minimumCoins` amount (default 10).
Pending requests reserve earnings immediately; rejecting a request releases
that reservation, and marking it Paid records completion. The bank details are
copied into each request so later profile edits do not change an existing
payout destination. The default `payout.holdDays` setting is 0.

Administrators can list pending payouts at `GET /admin/payout/requests`, mark a
manual bank transfer Paid with `PATCH /admin/payout/requests/:id/paid`, reject
with `PATCH /admin/payout/requests/:id/reject`, update the minimum using
`PATCH /admin/payout/settings`, and block or unblock a creator with
`PATCH /admin/payout/users/:userId/block`.

## Common problems

- `P1001` at `localhost:14331`: SQL Server is not running. Run `docker compose up -d sqlserver` and wait until the container is healthy.
- `P3005` or migration errors: check that `DATABASE_URL` points to the same database and credentials as the container.
- `401 Unauthorized`: login first and use the returned access token in the Bearer header.
- Cloudinary variables are only needed when testing upload endpoints.