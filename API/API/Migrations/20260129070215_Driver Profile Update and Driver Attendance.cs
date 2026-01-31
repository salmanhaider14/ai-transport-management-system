using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class DriverProfileUpdateandDriverAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DriverProfiles_AspNetUsers_UserId",
                table: "DriverProfiles");

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "DriverProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateOfJoining",
                table: "DriverProfiles",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContact",
                table: "DriverProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NationalId",
                table: "DriverProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DriverAttendances",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DriverProfileId = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CheckInTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    CheckOutTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    Remarks = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DriverAttendances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DriverAttendances_DriverProfiles_DriverProfileId",
                        column: x => x.DriverProfileId,
                        principalTable: "DriverProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DriverAttendances_DriverProfileId_Date",
                table: "DriverAttendances",
                columns: new[] { "DriverProfileId", "Date" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_DriverProfiles_AspNetUsers_UserId",
                table: "DriverProfiles",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DriverProfiles_AspNetUsers_UserId",
                table: "DriverProfiles");

            migrationBuilder.DropTable(
                name: "DriverAttendances");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "DriverProfiles");

            migrationBuilder.DropColumn(
                name: "DateOfJoining",
                table: "DriverProfiles");

            migrationBuilder.DropColumn(
                name: "EmergencyContact",
                table: "DriverProfiles");

            migrationBuilder.DropColumn(
                name: "NationalId",
                table: "DriverProfiles");

            migrationBuilder.AddForeignKey(
                name: "FK_DriverProfiles_AspNetUsers_UserId",
                table: "DriverProfiles",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
