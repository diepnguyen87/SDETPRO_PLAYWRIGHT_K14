import fs from "fs";
import path from "path";
import { client } from "./aiClient.js";
import { aiConfig } from "../config/ai.config.js";
import { frameworkConfig } from "../config/framework.config.js";
import { FailureAnalysis } from "../models/ai/AIAnalysis.js";
import { Metadata } from "./Metadata.js";
import { buildPrompt } from "./promptBuilder.js";
import { FAILURE_ANALYSIS_SYSTEM_PROMPT } from "./prompts/FailureAnalysisPrompt.js";
import MarkdownReport from "./MarkdownReport.js";

export default class FailureAnalyzer {

    public async analyze(folder: string): Promise<FailureAnalysis> {
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

        const textPrompt = buildPrompt(metadata, html, component);

        fs.writeFileSync(
            path.join(folder, frameworkConfig.promtName),
            textPrompt,
            "utf8"
        );

        const response = await client.responses.create({
            model: aiConfig.model,
            input: [
                {
                    role: "system",
                    content: [
                        {
                            type: "input_text",
                            text: FAILURE_ANALYSIS_SYSTEM_PROMPT
                        }
                    ]
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: textPrompt
                        },
                        {
                            type: "input_image",
                            image_url: `data:image/png;base64,${base64}`,
                            detail: aiConfig.imageDetail
                        }
                    ]
                }
            ]
        });

        const analysis: FailureAnalysis = JSON.parse(response.output_text);

        fs.writeFileSync(
            path.join(folder, frameworkConfig.aiResponseName_json),
            JSON.stringify(analysis, null, 4),
            "utf8"
        );

        fs.writeFileSync(
            path.join(folder, frameworkConfig.aiResponseName_md),
            MarkdownReport.generate(analysis),
            "utf8"
        );

        return analysis;
    }
}
