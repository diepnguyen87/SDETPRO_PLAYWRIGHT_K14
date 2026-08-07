import { AIAnalysis } from "../models/ai/AIAnalysis.js";

export default class MarkdownReport {

    public static generate(analysis: AIAnalysis): string {

        return `
        # AI Analysis

            ## Reason
            ${analysis.reason}

            ## Confidence
            ${analysis.confidence}%

            ## Suggested Locator
            \`${analysis.newLocator}\`

            ## Strategy
            ${analysis.strategy}

            ## Explanation
            ${analysis.explanation}
        `;
    }
}