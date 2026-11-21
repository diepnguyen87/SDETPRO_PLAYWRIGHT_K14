import path from "path";
import { randomUUID } from "node:crypto";
import { Metadata } from "./Metadata.js";
import { frameworkConfig } from "../config/framework.config.js";

export default class TestCommandBuilder {

    public static build(metadata: Metadata): string {
        let command = `yarn playwright test`;
        // Full title anchored at the end, so "X" does not also match "X With Login"
        command += ` --grep="${this.escapeRegex(metadata.testName.trim())}$"`;
        command += ` --project="${metadata.browser}"`;
        command += ` --headed`;
        command += ` --config=playwright.config.web.js`;
        // Own output folder: Playwright empties its outputDir at start, so sharing the parent's would delete the parent's in-progress trace
        command += ` --output="${path.posix.join(frameworkConfig.healingRerunOutputFolder, randomUUID())}"`;

        return command;
    }

    private static escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}
