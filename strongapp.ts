import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables from .env or .env.local
dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * BetterMe Core Configuration and Utilities
 */
export const BetterMeConfig = {
  name: "BetterMe",
  version: "1.0.0",
  developer: "Antigravity Pair Programmer",
  workspacePath: "C:/Users/PC/.gemini/antigravity/scratch/strongapp",
};

/**
 * Initialize Gemini client helper
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("Warning: GEMINI_API_KEY is not defined or is placeholder in .env / .env.local");
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Quick coach response tester
 */
export async function testCoachResponse(prompt: string) {
  const client = getGeminiClient();
  if (!client) {
    console.log("No valid Gemini API key found. Please set GEMINI_API_KEY in your .env or .env.local file.");
    return;
  }

  try {
    console.log(`Sending prompt to coach: "${prompt}"...`);
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Eres Gastón, el coach de BetterMe. Responde corto y motivador.",
      }
    });
    console.log("\n--- Coach Response ---");
    console.log(response.text);
    console.log("----------------------");
  } catch (error) {
    console.error("Failed to fetch response:", error);
  }
}

// Check if this script was executed directly
if (process.argv[1] && (process.argv[1].endsWith('strongapp.ts') || process.argv[1].endsWith('strongapp.js') || process.argv[1].endsWith('betterme.ts'))) {
  console.log(`Starting ${BetterMeConfig.name} diagnostic test...`);
  testCoachResponse("¡Hola coach! Estoy listo para empezar hoy.");
}
