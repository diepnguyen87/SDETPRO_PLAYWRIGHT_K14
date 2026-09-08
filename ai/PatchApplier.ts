import fs from "fs";
import path from "path";
import { frameworkConfig } from "../config/framework.config.js";
import { LocatorPatch } from "../models/ai/LocatorPatch.js";
import { FailureAnalysis } from "../models/ai/AIAnalysis.js";

export default class PatchApplier {

    public static apply(artifactFolder: string): void {

        const patchPath = path.join(
            artifactFolder,
            frameworkConfig.locatorPath_json
        );

        const componentPath = path.join(
            artifactFolder,
            frameworkConfig.componentName
        );

        const patch: LocatorPatch = JSON.parse(
            fs.readFileSync(patchPath, "utf8")
        );

        let source = fs.readFileSync(
            componentPath,
            "utf8"
        );

        if (!source.includes(patch.oldValue)) {
            throw new Error(
                `Old locator not found: ${patch.oldValue}`
            );
        }

        source = source.replace(
            patch.oldValue,
            patch.newValue
        );

        fs.writeFileSync(
            componentPath,
            source,
            "utf8"
        );
    }

    public static applyToSource(sourceFile: string, analysis: FailureAnalysis): void {

        let source = fs.readFileSync(
            sourceFile,
            "utf8"
        );

        if (!source.includes(analysis.oldValue)) {
            throw new Error(
                `Old value not found in source: ${analysis.oldValue}`
            );
        }

        source = source.replace(
            analysis.oldValue,
            analysis.newValue
        );

        fs.writeFileSync(
            sourceFile,
            source,
            "utf8"
        );
    }
}
