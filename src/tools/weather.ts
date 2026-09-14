import type Anthropic from "@anthropic-ai/sdk";

export const weatherTool: Anthropic.Tool = {
  name: "get_weather",
  description:
    "Get the current weather for a city. Call this when the user asks about current weather, temperature, or conditions in a specific location.",
  input_schema: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name, e.g. Paris" },
      unit: { type: "string", enum: ["celsius", "fahrenheit"] },
    },
    required: ["city"],
  },
};

interface WeatherInput {
  city: string;
  unit?: "celsius" | "fahrenheit";
}

// Mock data only — no real API call. Swap this out for a real weather
// provider later; the tool schema and loop code don't need to change.
const MOCK_CONDITIONS: Record<string, { tempC: number; condition: string }> = {
  paris: { tempC: 18, condition: "cloudy" },
  tokyo: { tempC: 24, condition: "sunny" },
  "new york": { tempC: 15, condition: "rainy" },
};

export function runWeather(input: WeatherInput): string {
  const key = input.city.trim().toLowerCase();
  const data = MOCK_CONDITIONS[key] ?? { tempC: 20, condition: "clear" };
  const unit = input.unit ?? "celsius";
  const temperature =
    unit === "fahrenheit" ? Math.round((data.tempC * 9) / 5 + 32) : data.tempC;

  return JSON.stringify({ city: input.city, temperature, unit, condition: data.condition });
}
