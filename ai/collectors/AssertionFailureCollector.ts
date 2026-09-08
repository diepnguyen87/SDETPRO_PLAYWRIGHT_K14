import fs from "fs";
import path from "path";
import { Page, TestInfo } from "@playwright/test";
import SourceCodeCollector from "../SourceCodeCollector.js";
import StackTraceParser from "../StackTraceParser.js";
import { frameworkConfig } from "../../config/framework.config.js";
import { FailureContext } from "../../models/ai/FailureContext.js";
import { Metadata } from "../Metadata.js";

export default class AssertionFailureCollector {

    /**
     * Returns true when the error is a Playwright expect() assertion failure.
     *
     * Primary check:  presence of `matcherResult` — set by Playwright on all
     *                 assertion errors from expect() matchers.
     * Fallback check: constructor name used by Jest/Playwright internally.
     *
     * This guard prevents action errors (already handled by withHealing())
     * from being double-routed through assertion healing.
     */
    public static isAssertionError(error: unknown): boolean {
        if (!(error instanceof Error)) return false;
        if ("matcherResult" in error)  return true;
        if (error.constructor.name === "JestAssertionError") return true;
        return false;
    }

    /**
     * Collect page-level failure artifacts for an assertion failure and
     * return a FailureContext ready to be passed to HealingEngine.
     *
     * Side effects:
     * - Writes full-page screenshot, full DOM, source copy, and metadata
     *   to the artifact folder.
     */
    public static async collect(
        error:    unknown,
        page:     Page,
        testInfo: TestInfo
    ): Promise<FailureContext> {

        const folder = path.join(
            frameworkConfig.artifactFolder,
            testInfo.project.name,
            testInfo.title.replace(/\W+/g, "_")
        );
        fs.mkdirSync(folder, { recursive: true });

        // Full-page screenshot (wider context than component-scoped)
        await page.screenshot({
            path:     path.join(folder, frameworkConfig.screenshotName),
            fullPage: true
        });

        // Full page DOM
        fs.writeFileSync(
            path.join(folder, frameworkConfig.domName),
            await page.content(),
            "utf8"
        );

        // Locate source file from stack trace
        const sourceFile = this.resolveSourceFile(error, folder);

        const stackTrace = error instanceof Error ? (error.stack ?? "") : "";

        const metadata: Metadata = {
            testName:      testInfo.title,
            testFile:      path.relative(process.cwd(), testInfo.file),
            browser:       testInfo.project.name,
            error:         error instanceof Error ? error.message : String(error),
            stackTrace,
            url:           page.url(),
            failedLocator: "",   // not known for assertion failures
            timestamp:     new Date().toISOString()
        };

        fs.writeFileSync(
            path.join(folder, frameworkConfig.metadataName),
            JSON.stringify(metadata, null, 4),
            "utf8"
        );

        return {
            failureSource:  "ASSERTION",
            testName:       metadata.testName,
            testFile:       metadata.testFile,
            browser:        metadata.browser,
            error:          metadata.error ?? "",
            stackTrace,
            url:            metadata.url,
            failedLocator:  "",
            sourceFile,
            artifactFolder: folder,
            timestamp:      metadata.timestamp
        };
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Parse the stack trace for the most relevant application source frame.
     * If a class name is found, look up its source file via SourceCodeCollector.
     * Copy the source to the artifact folder as component.ts for FailureAnalyzer.
     *
     * Falls back to an empty component.ts when the source cannot be determined —
     * FailureAnalyzer will send an empty component source to the AI, which will
     * respond with patchType = MANUAL (safe fallback).
     *
     * Returns the absolute path to the original source file, or "" if not found.
     */
    private static resolveSourceFile(error: unknown, artifactFolder: string): string {
        const stack = error instanceof Error ? (error.stack ?? "") : "";
        const componentDest = path.join(artifactFolder, frameworkConfig.componentName);

        const frame = StackTraceParser.parse(stack);

        if (frame?.className) {
            try {
                const sourceFile = SourceCodeCollector.find(frame.className);
                fs.copyFileSync(sourceFile, componentDest);
                console.log(
                    `[AssertionFailureCollector] Source resolved: ${frame.className} → ${sourceFile}`
                );
                return sourceFile;
            } catch {
                console.log(
                    `[AssertionFailureCollector] Could not resolve source for class: ${frame.className}`
                );
            }
        } else {
            console.log(
                "[AssertionFailureCollector] No application frame found in stack trace."
            );
        }

        // Write empty component source — AI will return MANUAL
        fs.writeFileSync(componentDest, "", "utf8");
        return "";
    }
}
