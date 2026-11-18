# SQL Server API pilot

This package runs the .NET API against a **dedicated nonproduction SQL Server**. It does not deploy SQL Server, change the existing Netlify/Supabase staging site, or publish an Internet endpoint. The API binds to `127.0.0.1` on the host so an approved HTTPS reverse proxy or tunnel can be added later. A company domain is not required for the pilot.

## Before starting

1. Have IT or the hosting provider supply a pilot SQL Server database and a dedicated application login. Keep SQL Server on a private network. Use a separate privileged account to review and apply EF migrations. Do not use `sa` as the API login.
2. Have the provider supply a valid PFX certificate with a private key. Place it at `deploy/pilot/secrets/data-protection.pfx`, readable by the container's nonroot user. Keep the PFX and its password outside Git and back up both it and the `api-keys` Docker volume separately.
3. Obtain an approved **test** workflow delivery HTTPS endpoint and GA mailbox. The delivery worker starts automatically in the hosted API. Do not use real employee recipients until the pilot email policy is approved.
4. Copy `.env.example` to `.env` in this directory and replace every placeholder. Use distinct random secrets of at least 32 characters for delivery and GA gateway signing. Restrict the `.env` file to the pilot operator account; it contains database and certificate secrets.
5. Generate an idempotent migration script from `src/backend` using the pinned EF tool, have the database owner review it, and apply it only to the pilot database:

   ```powershell
   Set-Location src/backend
   dotnet tool restore
   dotnet build src/Tokin.CarService.Infrastructure/Tokin.CarService.Infrastructure.csproj --configuration Release
   dotnet ef migrations script --idempotent --no-build --configuration Release --project src/Tokin.CarService.Infrastructure --startup-project src/Tokin.CarService.Infrastructure --output pilot-migration.sql
   ```

   The script is generated locally and must not be committed with connection details or applied to production.

## Build and start

From the repository root:

```powershell
docker compose --env-file deploy/pilot/.env -f deploy/pilot/compose.yaml config --quiet
docker compose --env-file deploy/pilot/.env -f deploy/pilot/compose.yaml up --build -d
Invoke-RestMethod http://127.0.0.1:18080/api/health
```

If `PILOT_API_PORT` differs from `18080`, use that port for the health request. The health endpoint checks that the API process responds; its `database` field is not a database readiness check. Verify a database-backed reference endpoint separately after migration. Inspect startup failures with `docker compose --env-file deploy/pilot/.env -f deploy/pilot/compose.yaml logs api`.

The current Next.js migration is incomplete: some pages still use Supabase. Keep the existing staging site unchanged and use a separate pilot frontend only after its routes and environment settings have been reviewed. Set `CAR_SERVICE_BACKEND=sqlserver`, `CAR_SERVICE_API_URL` to the approved HTTPS API origin, and `GA_GATEWAY_SHARED_SECRET` to the matching test value on that separate frontend. The website must reach the API over HTTPS; browsers never connect to SQL Server.

Stop this API without deleting its keys with `docker compose --env-file deploy/pilot/.env -f deploy/pilot/compose.yaml down`. Do not use `down --volumes` unless the encrypted key ring has been backed up and its loss has been approved.
