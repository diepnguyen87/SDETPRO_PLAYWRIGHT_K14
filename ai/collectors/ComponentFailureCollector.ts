import fs from "fs";
import path from "path";
import { Locator, Page, TestInfo } from "@playwright/test";
import { FailedLocatorManager } from "../../models/pages/FailedLocatorManager.js";
import SourceCodeCollector from "../SourceCodeCollector.js";
import { frameworkConfig } from "../../config/framework.config.js";
import { FailureContext } from "../../models/ai/FailureContext.js";
import { Metadata } from "../Metadata.js";

export interface ComponentCollectorParams {
    page:               Page;
    componentLocator:   Locator;
    testInfo:           TestInfo;
    componentClassName: string;
}

export default class ComponentFailureCollector {

    /**
     * Collect all failure artifacts for a component action failure and
     * return a FailureContext ready to be passed to HealingEngine.
     *
     * Side effects:
     * - Registers the failed locator with FailedLocatorManager
     * - Writes screenshot, DOM, component source copy, and metadata to the artifact folder
     */
    public static async collect(
        params:      ComponentCollectorParams,
        selectorStr: string,
        error:       unknown
    ): Promise<FailureContext> {

        const { page, componentLocator, testInfo, componentClassName } = params;

        // Register the failed locator (required — do not remove)
        FailedLocatorManager.set(selectorStr);

        const folder = path.join(
            frameworkConfig.artifactFolder,
            testInfo.project.name,
            testInfo.title.replace(/\W+/g, "_")
        );
        fs.mkdirSync(folder, { recursive: true });

        // Locate and copy the component source file
        const sourceFile = SourceCodeCollector.find(componentClassName);
        fs.copyFileSync(sourceFile, path.join(folder, frameworkConfig.componentName));

        // Screenshot scoped to the component locator
        await componentLocator.screenshot({
            path: path.join(folder, frameworkConfig.screenshotName)
        });

        // DOM scoped to the component locator
        fs.writeFileSync(
            path.join(folder, frameworkConfig.domName),
            await componentLocator.innerHTML(),
            "utf8"
        );

        const metadata: Metadata = {
            testName:     testInfo.title,
            testFile:     path.relative(process.cwd(), testInfo.file),
            browser:      testInfo.project.name,
            error:        error instanceof Error ? error.message : String(error),
            stackTrace:   error instanceof Error ? (error.stack ?? "") : "",
            url:          page.url(),
            failedLocator: FailedLocatorManager.get() ?? "",
            timestamp:    new Date().toISOString()
        };

        fs.writeFileSync(
            path.join(folder, frameworkConfig.metadataName),
            JSON.stringify(metadata, null, 4),
            "utf8"
        );

        return {
            failureSource:  "ACTION",
            testName:       metadata.testName,
            testFile:       metadata.testFile,
            browser:        metadata.browser,
            error:          metadata.error ?? "",
            stackTrace:     metadata.stackTrace,
            url:            metadata.url,
            failedLocator:  metadata.failedLocator,
            sourceFile,
            artifactFolder: folder,
            timestamp:      metadata.timestamp
        };
    }
}
