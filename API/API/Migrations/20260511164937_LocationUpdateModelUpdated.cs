using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class LocationUpdateModelUpdated : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Accuracy",
                table: "LocationUpdates",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Heading",
                table: "LocationUpdates",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "SpeedKph",
                table: "LocationUpdates",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Accuracy",
                table: "LocationUpdates");

            migrationBuilder.DropColumn(
                name: "Heading",
                table: "LocationUpdates");

            migrationBuilder.DropColumn(
                name: "SpeedKph",
                table: "LocationUpdates");
        }
    }
}
