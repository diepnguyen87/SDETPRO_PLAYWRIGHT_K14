import path from "path";
import { frameworkConfig } from "../config/framework.config.js";
import { AIAnalysis } from "../models/ai/AIAnalysis.js";
import fs from 'fs'

export default class AIResponseValidator {

    public static validate(analysis: AIAnalysis, sourceFileAddress: string): void {

        // 1. Check required fields
        if (!analysis.field) {
            throw new Error(
                "AI response is missing field"
            );
        }

        if (!analysis.oldLocator) {
            throw new Error(
                "AI response is missing oldLocator"
            );
        }

        if (!analysis.newLocator) {
            throw new Error(
                "AI response is missing newLocator"
            );
        }

        // 2. Check confidence
        if (analysis.confidence < 80) {
            throw new Error(
                `AI confidence is too low: ${analysis.confidence}`
            );
        }

        // 3. Check old locator exists
        const componentSource = fs.readFileSync(path.resolve(sourceFileAddress), "utf8");

        if (!componentSource.includes(analysis.oldLocator)) {
            throw new Error(`Old locator not found in component source: ${analysis.oldLocator}`);
        }

        // 4. Check field exists
        if (!componentSource.includes(analysis.field)) {
            throw new Error(`Field not found in component source: ${analysis.field}`);
        }

        console.log(`AI response validated successfully: ${analysis.field}`);
    }
}