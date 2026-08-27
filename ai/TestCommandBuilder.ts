import { Metadata } from "openai/resources";

export default class TestCommandBuilder {

    public static build(metadata: Metadata): string {
        const tag = metadata.testName.split(" ")[0];
        let command = `yarn test:${tag.substring(1).toLowerCase()}`;
        command += ` --project="${metadata.browser}"`;
        command += " --headed"
        return command;
    }

    private static escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}