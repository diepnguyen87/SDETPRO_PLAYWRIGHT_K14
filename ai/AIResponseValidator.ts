import path from "path";
import { FailureAnalysis, PatchType } from "../models/ai/AIAnalysis.js";
import fs from 'fs';

export default class AIResponseValidator {

    public static validate(analysis: FailureAnalysis, sourceFileAddress: string): void {

        // 1. Check required fields
        if (!analysis.field) {
            throw new Error("AI response is missing field");
        }

        if (!analysis.oldValue) {
            throw new Error("AI response is missing oldValue");
        }

        if (!analysis.newValue) {
            throw new Error("AI response is missing newValue");
        }

        if (!analysis.rootCause) {
            throw new Error("AI response is missing rootCause");
        }

        if (!analysis.patchType) {
            throw new Error("AI response is missing patchType");
        }

        // 2. Check patch confidence — must be ≥ 80 to apply an auto-patch
        if (analysis.patchConfidence < 80) {
            throw new Error(`AI patch confidence is too low: ${analysis.patchConfidence}`);
        }

        // 3. MANUAL patches should not reach validator — guard only
        if (analysis.patchType === PatchType.MANUAL) {
            throw new Error(`PatchType.MANUAL cannot be applied automatically: ${analysis.reason}`);
        }

        // 4. Check oldValue exists in source
        const componentSource = fs.readFileSync(path.resolve(sourceFileAddress), "utf8");

        if (!componentSource.includes(analysis.oldValue)) {
            throw new Error(`Old value not found in component source: ${analysis.oldValue}`);
        }

        // 5. Check field exists in source
        if (!componentSource.includes(analysis.field)) {
            throw new Error(`Field not found in component source: ${analysis.field}`);
        }

        console.log(`AI response validated successfully: ${analysis.field} [${analysis.rootCause}]`);
    }
}
