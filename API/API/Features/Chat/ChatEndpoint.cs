namespace API.Features.Chat;

using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Features.Entities;

public static class ChatEndpoint
{
    public static async Task<Results<Ok<ChatResponse>, BadRequest<string>>> Handler(
        ChatRequest request,
        ApplicationDbContext db,
        IConfiguration config,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return TypedResults.BadRequest("Message cannot be empty");

        // 1. Gather current context from database
        var context = await BuildContext(db, ct);

        // 2. Construct prompt for Gemini
        var prompt = $@"
You are a helpful transport assistant for University of Lahore Transport System.

Here is the current live data in JSON format:
{JsonSerializer.Serialize(context, new JsonSerializerOptions { WriteIndented = true })}

Instructions:
- Answer ONLY questions related to bus schedules, routes, bus locations, timings, or transport operations.
- Use the data provided above. Do NOT invent any information.
- If the question is not about transport, reply: ""I can only help with bus schedules, routes, and real-time bus locations.""
- Be friendly, concise, and helpful.

Student question: {request.Message}

Your answer:";

        // 3. Call Gemini API
        var geminiApiKey = config["Gemini:ApiKey"];
        if (string.IsNullOrEmpty(geminiApiKey))
            return TypedResults.BadRequest("Gemini API key not configured");

        var geminiResponse = await CallGemini(geminiApiKey, prompt, ct);
        
        return TypedResults.Ok(new ChatResponse (geminiResponse ));
    }

    private static async Task<object> BuildContext(ApplicationDbContext db, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5)); // PKT
        
        // Active buses with latest location
        var activeAssignments = await db.BusAssignments
            .Include(a => a.Bus)
            .Include(a => a.Route)
            .Include(a => a.TimeSlots)
            .Where(a => a.ServiceDate == today && 
                       (a.Status == AssignmentStatus.InProgress || 
                        a.Status == AssignmentStatus.Scheduled ||
                        a.Status == AssignmentStatus.PartiallyCompleted))
            .ToListAsync(ct);

        var activeBuses = new List<object>();
        foreach (var assignment in activeAssignments)
        {
            var latestLocation = await db.LocationUpdates
                .Where(l => l.BusAssignmentId == assignment.Id)
                .OrderByDescending(l => l.Timestamp)
                .FirstOrDefaultAsync(ct);
                
            activeBuses.Add(new
            {
                assignment.Bus.BusNumber,
                assignment.Route.Name,
                assignment.Status,
                CurrentLocation = latestLocation != null ? 
                    new { latestLocation.Latitude, latestLocation.Longitude, latestLocation.SpeedKph } : null,
                TimeSlots = assignment.TimeSlots.Select(s => new { s.SlotNumber, s.StartTime, s.EndTime, s.Status })
            });
        }

        // Today's full schedule
        var todayAssignments = await db.BusAssignments
            .Include(a => a.Bus)
            .Include(a => a.Route)
            .Where(a => a.ServiceDate == today && a.Status != AssignmentStatus.Cancelled)
            .Select(a => new { a.Bus.BusNumber, a.Route.Name, a.ServiceDate, a.Status })
            .ToListAsync(ct);

        // All routes with stops
        var routes = await db.Routes
            .Include(r => r.Stops.OrderBy(s => s.StopOrder))
            .Where(r => r.IsActive)
            .Select(r => new { r.Name, Stops = r.Stops.Select(s => s.Name) })
            .ToListAsync(ct);

        return new
        {
            CurrentTime = DateTime.UtcNow.AddHours(5).ToString("hh:mm tt"),
            ActiveBuses = activeBuses,
            TodaySchedule = todayAssignments,
            Routes = routes
        };
    }

    private static async Task<string> CallGemini(string apiKey, string prompt, CancellationToken ct)
    {
        using var client = new HttpClient();
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={apiKey}";
        
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[] { new { text = prompt } }
                }
            }
        };
        
        var content = new StringContent(
            JsonSerializer.Serialize(requestBody),
            Encoding.UTF8,
            "application/json");
            
        var response = await client.PostAsync(url, content, ct);
        var jsonResponse = await response.Content.ReadAsStringAsync(ct);
        
        // Parse response
        using var doc = JsonDocument.Parse(jsonResponse);
        // Check for API error first
if (doc.RootElement.TryGetProperty("error", out var error))
{
    var errorMessage = error.GetProperty("message").GetString();
    throw new Exception($"Gemini API error: {errorMessage}");
}
        var reply = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();
            
        return reply ?? "Sorry, I couldn't process that request.";
    }

    internal static void MapChatEndpoint(this IEndpointRouteBuilder app) =>
        app.MapPost("/chat", Handler)
            .WithSummary("AI Chatbot for student queries")
            .RequireAuthorization(p => p.RequireRole(AppRoles.Student, AppRoles.Admin));
}

public record ChatRequest(string Message);
public record ChatResponse(string Reply);