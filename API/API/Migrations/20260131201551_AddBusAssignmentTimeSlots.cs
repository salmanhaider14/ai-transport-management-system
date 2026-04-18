using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddBusAssignmentTimeSlots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BusAssignments_BusId_ServiceDate_StartTime",
                table: "BusAssignments");

            migrationBuilder.DropIndex(
                name: "IX_BusAssignments_DriverProfileId",
                table: "BusAssignments");

            migrationBuilder.DropColumn(
                name: "EndTime",
                table: "BusAssignments");

            migrationBuilder.DropColumn(
                name: "StartTime",
                table: "BusAssignments");

            migrationBuilder.AddColumn<int>(
                name: "BusAssignmentId1",
                table: "LocationUpdates",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TimeSlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BusAssignmentId = table.Column<int>(type: "integer", nullable: false),
                    SlotNumber = table.Column<int>(type: "integer", nullable: false),
                    StartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    EndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ActualStartTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    ActualEndTime = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimeSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TimeSlots_BusAssignments_BusAssignmentId",
                        column: x => x.BusAssignmentId,
                        principalTable: "BusAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LocationUpdates_BusAssignmentId1",
                table: "LocationUpdates",
                column: "BusAssignmentId1");

            migrationBuilder.CreateIndex(
                name: "IX_BusAssignments_BusId_ServiceDate_Status",
                table: "BusAssignments",
                columns: new[] { "BusId", "ServiceDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_BusAssignments_DriverProfileId_ServiceDate",
                table: "BusAssignments",
                columns: new[] { "DriverProfileId", "ServiceDate" });

            migrationBuilder.CreateIndex(
                name: "IX_BusAssignments_ServiceDate",
                table: "BusAssignments",
                column: "ServiceDate");

            migrationBuilder.CreateIndex(
                name: "IX_BusAssignments_Status",
                table: "BusAssignments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_BusAssignmentId_SlotNumber",
                table: "TimeSlots",
                columns: new[] { "BusAssignmentId", "SlotNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_BusAssignmentId_StartTime",
                table: "TimeSlots",
                columns: new[] { "BusAssignmentId", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_StartTime",
                table: "TimeSlots",
                column: "StartTime");

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlots_Status",
                table: "TimeSlots",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_LocationUpdates_BusAssignments_BusAssignmentId1",
                table: "LocationUpdates",
                column: "BusAssignmentId1",
                principalTable: "BusAssignments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LocationUpdates_BusAssignments_BusAssignmentId1",
                table: "LocationUpdates");

            migrationBuilder.DropTable(
                name: "TimeSlots");

            migrationBuilder.DropIndex(
                name: "IX_LocationUpdates_BusAssignmentId1",
                table: "LocationUpdates");

            migrationBuilder.DropIndex(
                name: "IX_BusAssignments_BusId_ServiceDate_Status",
                table: "BusAssignments");

            migrationBuilder.DropIndex(
                name: "IX_BusAssignments_DriverProfileId_ServiceDate",
                table: "BusAssignments");

            migrationBuilder.DropIndex(
                name: "IX_BusAssignments_ServiceDate",
                table: "BusAssignments");

            migrationBuilder.DropIndex(
                name: "IX_BusAssignments_Status",
                table: "BusAssignments");

            migrationBuilder.DropColumn(
                name: "BusAssignmentId1",
                table: "LocationUpdates");

            migrationBuilder.AddColumn<TimeOnly>(
                name: "EndTime",
                table: "BusAssignments",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));

            migrationBuilder.AddColumn<TimeOnly>(
                name: "StartTime",
                table: "BusAssignments",
                type: "time without time zone",
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));

            migrationBuilder.CreateIndex(
                name: "IX_BusAssignments_BusId_ServiceDate_StartTime",
                table: "BusAssignments",
                columns: new[] { "BusId", "ServiceDate", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "IX_BusAssignments_DriverProfileId",
                table: "BusAssignments",
                column: "DriverProfileId");
        }
    }
}
