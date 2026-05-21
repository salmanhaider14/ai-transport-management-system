namespace API.Features.Location;

public record SendLocationCommand(
    int BusAssignmentId,
    double Latitude,
    double Longitude,
    double? SpeedKph = null,
    double? Heading = null,
    double? Accuracy = null
);

public record LocationResponse(
    int Id,
    int BusAssignmentId,
    double Latitude,
    double Longitude,
    double? SpeedKph,
    double? Heading,
    DateTime Timestamp
);

public record ActiveBusResponse(
    int AssignmentId,
    int BusId,
    string BusNumber,
    int RouteId,
    string RouteName,
    double Latitude,
    double Longitude,
    double? SpeedKph,
    DateTime LastUpdate,
    string CurrentStatus
);

public record BusLocationResponse(
    double Latitude,
    double Longitude,
    double? SpeedKph,
    DateTime LastUpdate,
    string Status,
    double? EtaMinutes = null,
    string? EtaText = null
);