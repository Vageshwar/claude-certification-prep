import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { runWeather } from "./weather.js";

export const weatherZodTool = betaZodTool({
  name: "get_weather",
  description:
    "Get the current weather for a city. Call this when the user asks about current weather, temperature, or conditions in a specific location.",
  inputSchema: z.object({
    city: z.string().describe("City name, e.g. Paris"),
    unit: z.enum(["celsius", "fahrenheit"]).optional(),
  }),
  run: async (input) => runWeather(input),
});
