import { Metadata } from "./Metadata.js";

export default class TestCommandBuilder {

    public static build(metadata: Metadata): string {
        const parts = metadata.testName.split("|");
        const testcaseName = (parts[1] ?? parts[0]).trim();
        let command = `yarn playwright test`;
        command += ` --grep="${this.escapeRegex(testcaseName)}"`;
        command += ` --project="${metadata.browser}"`;
        command += ` --headed`;
        command += ` --config=playwright.config.web.js`;

        return command;
    }

    private static escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}