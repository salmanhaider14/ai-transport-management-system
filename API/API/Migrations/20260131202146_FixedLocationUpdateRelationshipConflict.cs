using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class FixedLocationUpdateRelationshipConflict : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LocationUpdates_BusAssignments_BusAssignmentId1",
                table: "LocationUpdates");

            migrationBuilder.DropIndex(
                name: "IX_LocationUpdates_BusAssignmentId1",
                table: "LocationUpdates");

            migrationBuilder.DropColumn(
                name: "BusAssignmentId1",
                table: "LocationUpdates");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BusAssignmentId1",
                table: "LocationUpdates",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LocationUpdates_BusAssignmentId1",
                table: "LocationUpdates",
                column: "BusAssignmentId1");

            migrationBuilder.AddForeignKey(
                name: "FK_LocationUpdates_BusAssignments_BusAssignmentId1",
                table: "LocationUpdates",
                column: "BusAssignmentId1",
                principalTable: "BusAssignments",
                principalColumn: "Id");
        }
    }
}
