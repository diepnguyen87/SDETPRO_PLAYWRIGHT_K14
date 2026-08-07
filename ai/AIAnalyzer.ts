import fs from "fs";
import path from "path";
import { buildPrompt } from "./promptBuilder.js";
import { Metadata } from "./types.js";
import { client } from "./aiClient.js";
import { aiConfig } from "../config/ai.config.js";
import { frameworkConfig } from "../config/framework.config.js";
import { AIAnalysis } from "../models/ai/AIAnalysis.js";
import MarkdownReport from "./MarkdownReport.js";
import { SYSTEM_PROMPT } from "./prompts/system.prompt.js";

export default class AIAnalyzer {

    public async analyze(folder: string): Promise<AIAnalysis> {
        const metadata: Metadata = JSON.parse(
            fs.readFileSync(
                path.join(folder, frameworkConfig.metadataName),
                "utf8"
            )
        );

        const html = fs.readFileSync(
            path.join(folder, frameworkConfig.domName),
            "utf8"
        );

        const image = fs.readFileSync(
            path.join(folder, frameworkConfig.screenshotName)
        );
        const base64 = image.toString("base64");

        const component = fs.readFileSync(
            path.join(folder, frameworkConfig.componentName),
            "utf8"
        );
        
        const prompt = buildPrompt(
            metadata,
            html,
            component
        );

        fs.writeFileSync(
            path.join(folder, frameworkConfig.promtName),
            prompt,
            "utf8"
        );
        //Way 1: Metadata + DOM
        const response =
            await client.responses.create({
                model: aiConfig.model,
                input: prompt
            });
        //Way 2: Metadata + DOM + Screenshot
        const response1 = await client.responses.create({
            model: "gpt-5-mini",
            input: [
                {
                    role: "system",
                    content: [
                        {
                            type: "input_text",
                            text: SYSTEM_PROMPT
                        }
                    ]
                },
                {
                    role: "user",
                    content: [

                        {
                            type: "input_text",
                            text: prompt
                        },
                        {
                            type: "input_image",
                            image_url: `data:image/png;base64,${base64}`,
                            detail: "high"
                        }
                    ]
                }
            ]
        });


        const analysis: AIAnalysis = JSON.parse(response1.output_text);
        fs.writeFileSync(
            path.join(folder, frameworkConfig.aiResponseName_json),
            JSON.stringify(
                analysis,
                null,
                4
            ),
            "utf8"
        );

        const markdown = MarkdownReport.generate(analysis);
        fs.writeFileSync(
            `${folder}/${frameworkConfig.aiResponseName_md}`,
            markdown,
            "utf8"
        );
        return analysis;
    }
}