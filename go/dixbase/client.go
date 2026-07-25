package dixbase

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"strconv"
	"time"
)

type Client struct {
	APIKey  string
	BaseURL string
	HTTP    *http.Client
}

func New(apiKey string) *Client {
	return &Client{APIKey: apiKey, BaseURL: "https://app.dixbase.com/v1", HTTP: http.DefaultClient}
}

func (c *Client) Currencies() (map[string]any, error) {
	return c.request("GET", "/business/api/checkout/currencies", nil, "")
}

func (c *Client) CreateCheckout(payload map[string]any, idempotencyKey string) (map[string]any, error) {
	return c.request("POST", "/business/api/checkout/sessions", payload, idempotencyKey)
}

func (c *Client) CreateSandbox(payload map[string]any, idempotencyKey string) (map[string]any, error) {
	return c.request("POST", "/business/api/sandbox/checkout/sessions", payload, idempotencyKey)
}

func (c *Client) WebhookDeliveries() (map[string]any, error) {
	return c.request("GET", "/business/api/webhooks/deliveries", nil, "")
}

func (c *Client) request(method, path string, payload map[string]any, idempotencyKey string) (map[string]any, error) {
	var body io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		body = bytes.NewReader(raw)
	}
	req, err := http.NewRequest(method, strings.TrimRight(c.BaseURL, "/")+path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "dixbase-go/1.0.0")
	if idempotencyKey != "" {
		req.Header.Set("Idempotency-Key", idempotencyKey)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]any
	_ = json.Unmarshal(raw, &out)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("dixbase error %d: %s", resp.StatusCode, string(raw))
	}
	return out, nil
}

func VerifySignature(rawBody []byte, header, secret string, tolerance time.Duration) (map[string]any, error) {
	if header == "" || secret == "" {
		return nil, errors.New("missing signature or secret")
	}
	timestamp, signature := parseSignature(header)
	if timestamp == "" || signature == "" {
		return nil, errors.New("invalid signature header")
	}
	seconds, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return nil, errors.New("invalid signature timestamp")
	}
	if tolerance > 0 && time.Since(time.Unix(seconds, 0)) > tolerance {
		return nil, errors.New("signature timestamp outside tolerance")
	}
	signed := []byte(timestamp + "." + string(rawBody))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(signed)
	expected := hex.EncodeToString(mac.Sum(nil))
	if subtle.ConstantTimeCompare([]byte(expected), []byte(signature)) != 1 {
		return nil, errors.New("invalid signature")
	}
	var event map[string]any
	return event, json.Unmarshal(rawBody, &event)
}

func parseSignature(header string) (string, string) {
	var timestamp, signature string
	for _, part := range strings.Split(header, ",") {
		pair := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(pair) != 2 {
			continue
		}
		if pair[0] == "t" {
			timestamp = pair[1]
		}
		if pair[0] == "v1" {
			signature = pair[1]
		}
	}
	return timestamp, signature
}
