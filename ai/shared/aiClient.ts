import OpenAI from "openai";
import "dotenv/config";

if (!process.env.OPEN_API_KEY) {
    throw new Error("OPEN_API_KEY is missing.");
}

export const client = new OpenAI({
    apiKey: process.env.OPEN_API_KEY, 
});