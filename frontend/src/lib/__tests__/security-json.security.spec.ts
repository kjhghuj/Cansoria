import { describe, expect, it } from "@jest/globals";
import { serializeJsonLd } from "@/lib/security-json";

describe("JSON-LD serialization", () => {
  it("prevents closing the script while retaining the original JSON data", () => {
    const value = { name: '</script><script>alert("🎨")</script>', other: '<!--\u2028\u2029&' };
    const json = serializeJsonLd(value);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual(value);
  });

  it("serializes empty and nullable values as valid JSON", () => {
    expect(serializeJsonLd(null)).toBe("null");
    expect(JSON.parse(serializeJsonLd({ empty: "", nil: null }))).toEqual({ empty: "", nil: null });
  });
});
