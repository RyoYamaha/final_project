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

## Common problems

- `P1001` at `localhost:14331`: SQL Server is not running. Run `docker compose up -d sqlserver` and wait until the container is healthy.
- `P3005` or migration errors: check that `DATABASE_URL` points to the same database and credentials as the container.
- `401 Unauthorized`: login first and use the returned access token in the Bearer header.
- Cloudinary variables are only needed when testing upload endpoints.