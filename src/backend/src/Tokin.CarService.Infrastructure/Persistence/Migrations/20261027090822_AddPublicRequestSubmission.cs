using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tokin.CarService.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicRequestSubmission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PublicRequestAttempts",
                schema: "security",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FingerprintHash = table.Column<string>(type: "varchar(64)", unicode: false, maxLength: 64, nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "TODATETIMEOFFSET(SYSUTCDATETIME(), '+00:00')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicRequestAttempts", x => x.Id);
                    table.CheckConstraint("CK_PublicRequestAttempts_FingerprintHash", "LEN([FingerprintHash]) = 64 AND [FingerprintHash] NOT LIKE '%[^0-9a-f]%'");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PublicRequestAttempts_FingerprintHash_CreatedAtUtc",
                schema: "security",
                table: "PublicRequestAttempts",
                columns: new[] { "FingerprintHash", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PublicRequestAttempts",
                schema: "security");
        }
    }
}
