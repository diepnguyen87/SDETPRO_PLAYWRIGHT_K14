import "dotenv/config";

export const aiConfig = {
    apiKey: process.env.OPEN_API_KEY ?? "",
    model: "gpt-5-mini",
    imageDetail: "high" as const
};

if (!aiConfig.apiKey) {
    throw new Error("OPEN_API_KEY is not configured.");
}