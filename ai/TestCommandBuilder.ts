import { Metadata } from "openai/resources";

export default class TestCommandBuilder {

    public static build(metadata: Metadata): string {
        const testcaseName = metadata.testName.split("|")[1];
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