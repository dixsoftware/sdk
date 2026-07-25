import { describe, expect, it } from "vitest";
import { stripTrailingSlash } from "../src/utils";

describe("utils", () => {
  it("strips trailing slashes without changing the middle of a URL", () => {
    expect(stripTrailingSlash("https://app.dixbase.com/v1///")).toBe("https://app.dixbase.com/v1");
    expect(stripTrailingSlash("https://app.dixbase.com/v1/business/api")).toBe(
      "https://app.dixbase.com/v1/business/api"
    );
  });
});
