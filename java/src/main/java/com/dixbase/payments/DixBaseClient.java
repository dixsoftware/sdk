package com.dixbase.payments;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

public class DixBaseClient {
  private final String apiKey;
  private final String baseUrl;
  private final HttpClient http = HttpClient.newHttpClient();

  public DixBaseClient(String apiKey) {
    this(apiKey, "https://app.dixbase.com/v1");
  }

  public DixBaseClient(String apiKey, String baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replaceAll("/+$", "");
  }

  public String currencies() throws Exception {
    return send("GET", "/business/api/checkout/currencies", null, null);
  }

  public String createCheckout(String json, String idempotencyKey) throws Exception {
    return send("POST", "/business/api/checkout/sessions", json, idempotencyKey);
  }

  public String webhookDeliveries() throws Exception {
    return send("GET", "/business/api/webhooks/deliveries", null, null);
  }

  private String send(String method, String path, String json, String idempotencyKey) throws Exception {
    HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(baseUrl + path))
      .header("Authorization", "Bearer " + apiKey)
      .header("User-Agent", "dixbase-java/1.0.0");
    if (idempotencyKey != null) builder.header("Idempotency-Key", idempotencyKey);
    if ("POST".equals(method)) builder.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json));
    else builder.GET();
    HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() >= 400) throw new RuntimeException(response.body());
    return response.body();
  }

  public static boolean verifySignature(String rawBody, String header, String secret) throws Exception {
    String timestamp = null, signature = null;
    for (String part : header.split(",")) {
      String[] pair = part.trim().split("=", 2);
      if (pair.length == 2 && pair[0].equals("t")) timestamp = pair[1];
      if (pair.length == 2 && pair[0].equals("v1")) signature = pair[1];
    }
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    String expected = toHex(mac.doFinal((timestamp + "." + rawBody).getBytes(StandardCharsets.UTF_8)));
    return java.security.MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
  }

  private static String toHex(byte[] bytes) {
    StringBuilder builder = new StringBuilder(bytes.length * 2);
    for (byte value : bytes) {
      builder.append(String.format("%02x", value));
    }
    return builder.toString();
  }
}
