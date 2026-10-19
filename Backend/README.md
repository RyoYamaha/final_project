# Backend API

## Run locally

1. Start SQL Server from the repository root:

   ```powershell
   docker compose up -d sqlserver
   ```

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

3. Configure SePay to send bank-change webhooks to `POST /payments/webhook/sepay`
   with the `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>` header.
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
Author/Publisher chooses the catalogue price in coins; future purchase routes
must calculate and debit the actual charge on the server from this stored price.

Fan Translations are always stored as free with a zero price. They can only be
created from a published Licensed title when its Publisher has enabled
`allowCommunityTranslation` while the title is free. Only Licensed titles can
enable this option; switching a title to paid automatically disables it.
Existing Fan Translations stay public for 14 days after the title changes to
paid, then disappear from public content, ranking, manga-page, and novel-reading
endpoints. Authors can update these fields through their existing
`PATCH /author/content/:id` endpoint, and Publishers through
`PATCH /publisher/content/:id`.

## Wallet

Authenticated users can check their coin balance with `GET /wallet/balance` and
their paginated coin ledger with `GET /wallet/transactions?page=1&limit=20`.
The transaction endpoint returns `items`, `page`, `limit`, `total`, and
`totalPages`; `limit` is capped at 100. A user without a wallet yet has a balance
of zero and an empty transaction history. Both endpoints are scoped to the user
identified by the JWT.

## Common problems

- `P1001` at `localhost:14331`: SQL Server is not running. Run `docker compose up -d sqlserver` and wait until the container is healthy.
- `P3005` or migration errors: check that `DATABASE_URL` points to the same database and credentials as the container.
- `401 Unauthorized`: login first and use the returned access token in the Bearer header.
- Cloudinary variables are only needed when testing upload endpoints.