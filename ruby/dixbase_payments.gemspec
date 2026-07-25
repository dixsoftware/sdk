Gem::Specification.new do |spec|
  spec.name = "dixbase_payments"
  spec.version = "1.0.0"
  spec.summary = "DixBase payments SDK for Ruby."
  spec.authors = ["DixBase"]
  spec.homepage = "https://github.com/dixsoftware/sdk"
  spec.license = "MIT"
  spec.metadata = {
    "source_code_uri" => "https://github.com/dixsoftware/sdk/tree/main/ruby",
    "bug_tracker_uri" => "https://github.com/dixsoftware/sdk/issues"
  }
  spec.files = Dir["lib/**/*.rb", "README.md"]
  spec.required_ruby_version = ">= 3.0"
end
