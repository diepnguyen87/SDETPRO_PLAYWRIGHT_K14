import { FailureAnalysis } from "../models/ai/AIAnalysis.js";

export default class MarkdownReport {

    public static generate(analysis: FailureAnalysis): string {

        return `
        # AI Failure Analysis

            ## Root Cause
            ${analysis.rootCause}

            ## Patch Type
            ${analysis.patchType}

            ## Reason
            ${analysis.reason}

            ## Root Cause Confidence
            ${analysis.rootCauseConfidence}%

            ## Patch Confidence
            ${analysis.patchConfidence}%

            ## Field
            \`${analysis.field}\`

            ## Old Value
            \`${analysis.oldValue}\`

            ## New Value
            \`${analysis.newValue}\`

            ## Strategy
            ${analysis.strategy}

            ## Explanation
            ${analysis.explanation}
        `;
    }
}
