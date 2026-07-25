require "json"
require "net/http"
require "openssl"

module DixBasePayments
  class Client
    def initialize(api_key:, base_url: "https://app.dixbase.com/v1")
      @api_key = api_key
      @base_url = base_url.sub(/\/+$/, "")
    end

    def currencies
      request("GET", "/business/api/checkout/currencies")
    end

    def create_checkout(payload, idempotency_key:)
      request("POST", "/business/api/checkout/sessions", payload, idempotency_key)
    end

    def create_sandbox(payload, idempotency_key:)
      request("POST", "/business/api/sandbox/checkout/sessions", payload, idempotency_key)
    end

    def webhook_deliveries
      request("GET", "/business/api/webhooks/deliveries")
    end

    private

    def request(method, path, payload = nil, idempotency_key = nil)
      uri = URI(@base_url + path)
      req = method == "POST" ? Net::HTTP::Post.new(uri) : Net::HTTP::Get.new(uri)
      req["Authorization"] = "Bearer #{@api_key}"
      req["Content-Type"] = "application/json"
      req["User-Agent"] = "dixbase-ruby/1.0.0"
      req["Idempotency-Key"] = idempotency_key if idempotency_key
      req.body = JSON.dump(payload) if payload
      res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") { |http| http.request(req) }
      raise res.body if res.code.to_i >= 400
      JSON.parse(res.body)
    end
  end

  def self.verify_signature(raw_body, header, secret)
    parts = header.split(",").map { |p| p.split("=", 2) }.to_h
    expected = OpenSSL::HMAC.hexdigest("SHA256", secret, "#{parts["t"]}.#{raw_body}")
    raise "Invalid DixBase webhook signature" unless secure_compare(expected, parts["v1"])
    JSON.parse(raw_body)
  end

  def self.secure_compare(left, right)
    return false unless left.bytesize == right.bytesize
    left.bytes.zip(right.bytes).reduce(0) { |acc, pair| acc | (pair[0] ^ pair[1]) } == 0
  end
end
