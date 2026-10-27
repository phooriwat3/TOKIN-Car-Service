# TOKIN Car Service .NET backend

This directory contains the SQL Server migration target. It is a modular monolith so the application can be deployed as one service while business rules, database access, and HTTP concerns remain separated.

## Projects

- `Tokin.CarService.Domain`: domain entities and invariants
- `Tokin.CarService.Application`: use cases and application contracts
- `Tokin.CarService.Infrastructure`: SQL Server and external service adapters
- `Tokin.CarService.Api`: ASP.NET Core HTTP API
- `Tokin.CarService.Api.Tests`: HTTP integration tests

## Verify

```powershell
dotnet restore .\src\backend\Tokin.CarService.slnx
dotnet test .\src\backend\Tokin.CarService.slnx --no-restore
```

## Local configuration

Copy `src/Tokin.CarService.Api/appsettings.Local.example.json` to `appsettings.Local.json` only when a dedicated development database is available. The local file is ignored by Git. Prefer user secrets or environment variables for passwords:

```powershell
$env:ConnectionStrings__PrimaryDatabase = "Server=...;Database=TOKIN_CarService_Dev;..."
```

Never commit a database password or use the production database for development.

## Database migrations

The EF Core model uses separate SQL Server schemas (`core`, `transport`, `security`, `workflow`, and `audit`). Restore the repository-pinned EF tool and generate or inspect migrations without connecting to a database:

```powershell
Set-Location .\src\backend
dotnet tool restore
dotnet ef migrations script --project .\src\Tokin.CarService.Infrastructure
```

Applying a migration requires an explicitly supplied development connection string and separate approval. Migration commands must never target the company production database from a developer workstation.

## Public request endpoint

Phase 2C adds the first SQL Server-backed vertical slice:

```text
POST /api/v1/requests
Idempotency-Key: a-client-generated-key-with-16-or-more-characters
```

The JSON body matches the existing public request form contract. The endpoint accepts `outside_company` and `overtime` request types, validates the requester and approver against allowed company email domains, enforces request-size and rate limits, and returns only the request ID, CSR number, status, and submission time.

One serializable SQL transaction writes the request, passenger or OT rider details, first revision, action-token hash, workflow outbox intent, durable rate-limit attempt, and idempotent response. A repeated key with the same body returns the original result; the same key with a different body returns HTTP 409. Any failed write rolls back the whole submission.

Raw confirmation tokens are never persisted. The `security.RequestAccessTokens` table stores a SHA-256 hash. The outbox payload stores only ASP.NET Core Data Protection ciphertext for the later notification worker. Production must persist and protect the Data Protection key ring outside the application container.

The current Next.js request form remains on the Supabase staging workflow until a later migration phase connects it to this endpoint. Phase 2C does not send an email or Teams message.

The editable workflow is in [`../../docs/diagrams/public-request-sqlserver-flow.excalidraw`](../../docs/diagrams/public-request-sqlserver-flow.excalidraw).

## Disposable SQL Server integration test

The SQL integration test is opt-in so normal test runs cannot contact an unintended database:

```powershell
$env:TOKIN_RUN_SQLSERVER_INTEGRATION = "1"
$env:TOKIN_TEST_SQLSERVER_CONNECTION = "Server=localhost,11433;Database=TokinCarServiceTest;User Id=sa;Password=...;Encrypt=True;TrustServerCertificate=True"
dotnet test .\src\backend\tests\Tokin.CarService.Api.Tests\Tokin.CarService.Api.Tests.csproj --configuration Release
```

Use only a disposable local container or an explicitly approved development database. Clear both environment variables after the run.
