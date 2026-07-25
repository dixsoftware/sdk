using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace DixBase.Payments;

public sealed class DixBaseClient
{
    private readonly HttpClient _http;
    private readonly string _baseUrl;

    public DixBaseClient(string apiKey, string baseUrl = "https://app.dixbase.com/v1", HttpClient? http = null)
    {
        _http = http ?? new HttpClient();
        _baseUrl = baseUrl.TrimEnd('/');
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("dixbase-dotnet/1.0.0");
    }

    public Task<JsonDocument> CurrenciesAsync() => SendAsync(HttpMethod.Get, "/business/api/checkout/currencies");

    public Task<JsonDocument> CreateCheckoutAsync(object payload, string idempotencyKey) =>
        SendAsync(HttpMethod.Post, "/business/api/checkout/sessions", payload, idempotencyKey);

    public Task<JsonDocument> CreateSandboxAsync(object payload, string idempotencyKey) =>
        SendAsync(HttpMethod.Post, "/business/api/sandbox/checkout/sessions", payload, idempotencyKey);

    public Task<JsonDocument> WebhookDeliveriesAsync() =>
        SendAsync(HttpMethod.Get, "/business/api/webhooks/deliveries");

    private async Task<JsonDocument> SendAsync(HttpMethod method, string path, object? payload = null, string? idempotencyKey = null)
    {
        using var request = new HttpRequestMessage(method, _baseUrl + path);
        if (payload is not null)
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
            request.Headers.TryAddWithoutValidation("Idempotency-Key", idempotencyKey);
        using var response = await _http.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException(body, null, response.StatusCode);
        return JsonDocument.Parse(body);
    }
}

public static class DixBaseWebhooks
{
    public static JsonDocument VerifySignature(string rawBody, string signatureHeader, string secret)
    {
        var parts = signatureHeader.Split(',').Select(p => p.Split('=', 2)).Where(p => p.Length == 2).ToDictionary(p => p[0], p => p[1]);
        var signed = $"{parts["t"]}.{rawBody}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var expected = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(signed))).ToLowerInvariant();
        if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(parts["v1"])))
            throw new InvalidOperationException("Invalid DixBase webhook signature.");
        return JsonDocument.Parse(rawBody);
    }
}
