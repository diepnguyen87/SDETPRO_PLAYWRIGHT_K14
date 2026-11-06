import { Metadata } from "./Metadata.js";

export default class TestCommandBuilder {

    public static build(metadata: Metadata): string {
        let command = `yarn playwright test`;
        // Full title anchored at the end, so "X" does not also match "X With Login"
        command += ` --grep="${this.escapeRegex(metadata.testName.trim())}$"`;
        command += ` --project="${metadata.browser}"`;
        command += ` --headed`;
        command += ` --config=playwright.config.web.js`;

        return command;
    }

    private static escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}