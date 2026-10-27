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
