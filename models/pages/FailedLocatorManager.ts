import { Page, TestInfo } from "@playwright/test";
import fs from "fs";
import path from "path";
import { Metadata } from "../../ai/types.js";
import { frameworkConfig } from "../../config/framework.config.js";

export class FailedLocatorManager {

    private static failedLocator: string | null = null;

    public static set(locator: string): void {
        this.failedLocator = locator;
    }

    public static get(): string | null {
        return this.failedLocator;
    }

    public static clear(): void {
        this.failedLocator = null;
    }

    async collect(page: Page, testInfo: TestInfo): Promise<string> {
        const folder = path.join(
            frameworkConfig.artifactFolder,
            testInfo.title.replace(/\W+/g, "_")
        );

        fs.mkdirSync(folder, { recursive: true });

        await page.screenshot({
            path: path.join(folder, frameworkConfig.screenshotName),
            fullPage: true
        });

        fs.writeFileSync(
            path.join(folder, frameworkConfig.domName),
            await page.content(),
            "utf8"
        );
        
        const metadata: Metadata = {
            testName: testInfo.title,
            browser: testInfo.project.name,
            error: testInfo.error?.message ?? '',
            url: page.url(),
            failedLocator: FailedLocatorManager.get() ?? '',
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(
            path.join(folder, frameworkConfig.metadataName),
            JSON.stringify(metadata, null, 4),
            "utf8"
        );
        return folder;
    }
}