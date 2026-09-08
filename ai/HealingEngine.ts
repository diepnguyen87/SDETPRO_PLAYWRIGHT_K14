import path from "path";
import fs from "fs";
import { TestInfo } from "@playwright/test";
import { FailureContext } from "../models/ai/FailureContext.js";
import { HealingResult } from "../models/ai/HealingResult.js";
import { FailureAnalysis, PatchType } from "../models/ai/AIAnalysis.js";
import FailureAnalyzer from "./FailureAnalyzer.js";
import AIResponseValidator from "./AIResponseValidator.js";
import BackupManager from "./BackupManager.js";
import PatchApplier from "./PatchApplier.js";
import PatchVerifier from "./PatchVerifier.js";
import TestCommandBuilder from "./TestCommandBuilder.js";
import TestRerunner from "./TestRerunner.js";
import HealingLock from "./HealingLock.js";
import { frameworkConfig } from "../config/framework.config.js";
import { Metadata } from "./Metadata.js";

export default class HealingEngine {

    /**
     * Entry point. Receives a FailureContext collected by a collector and
     * orchestrates the full healing lifecycle.
     *
     * Guarantees:
     * - Never throws. Always returns a HealingResult.
     * - Never hides the original test failure — callers must re-throw on non-HEALED status.
     * - Prevents recursive healing when running inside a healing rerun.
     * - Acquires a file-system lock before modifying any source file.
     */
    public static async handle(
        context: FailureContext,
        testInfo: TestInfo
    ): Promise<HealingResult> {

        // Guard: do not heal inside a healing rerun process
        if (process.env.HEALING_RERUN === "true") {
            console.log("[HealingEngine] Skipping — running inside a healing rerun.");
            return { status: "SKIPPED", reason: "Recursive healing prevented", retryCount: 0 };
        }

        const hasSourceFile = !!context.sourceFile;

        // Acquire file-system lock before the retry loop
        if (hasSourceFile) {
            const acquired = HealingLock.acquire(context.sourceFile);
            if (!acquired) {
                console.log(
                    `[HealingEngine] Source file locked by another worker: ${context.sourceFile}`
                );
                return {
                    status:    "SKIPPED",
                    reason:    "Source file is being healed by another worker",
                    retryCount: 0
                };
            }
        }

        try {
            return await this.runHealingLoop(context, testInfo);
        } catch (unexpectedError) {
            // Safety net for any unhandled engine bug
            console.error("[HealingEngine] Unexpected engine error:", unexpectedError);
            return {
                status:    "FAILED",
                reason:    `Unexpected engine error: ${(unexpectedError as Error).message}`,
                retryCount: 0
            };
        } finally {
            if (hasSourceFile) {
                HealingLock.release(context.sourceFile);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private — retry loop
    // ─────────────────────────────────────────────────────────────────────────

    private static async runHealingLoop(
        context:  FailureContext,
        testInfo: TestInfo
    ): Promise<HealingResult> {

        const maxRetries = frameworkConfig.maxHealingRetries;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(
                `[HealingEngine] Attempt ${attempt}/${maxRetries}` +
                ` | ${context.failureSource}` +
                ` | ${context.testName}`
            );

            const result = await this.runSingleAttempt(context, testInfo, attempt, maxRetries);
            if (result !== null) return result;

            // null → attempt failed but retries remain
        }

        // Unreachable in practice: runSingleAttempt returns FAILED when attempt === maxRetries
        return { status: "FAILED", reason: "Max retries exhausted", retryCount: maxRetries };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private — single attempt
    // Returns HealingResult for definitive outcomes.
    // Returns null to signal "retry" (only when attempt < maxRetries).
    // ─────────────────────────────────────────────────────────────────────────

    private static async runSingleAttempt(
        context:    FailureContext,
        testInfo:   TestInfo,
        attempt:    number,
        maxRetries: number
    ): Promise<HealingResult | null> {

        // ── Step A: AI analysis ──────────────────────────────────────────────

        let analysis: FailureAnalysis;

        try {
            analysis = await new FailureAnalyzer().analyze(context.artifactFolder);
        } catch (analyzerError) {
            const msg = (analyzerError as Error).message;
            console.error(`[HealingEngine] AI analysis failed on attempt ${attempt}: ${msg}`);
            if (attempt === maxRetries) {
                return { status: "FAILED", reason: `AI analysis failed: ${msg}`, retryCount: attempt };
            }
            return null;
        }

        // Attach AI response artifact to the test report (non-critical)
        try {
            await testInfo.attach(
                `AI Analysis — ${context.failureSource} (attempt ${attempt})`,
                {
                    path:        path.join(context.artifactFolder, frameworkConfig.aiResponseName_json),
                    contentType: "application/json"
                }
            );
        } catch {
            // Non-critical — continue regardless
        }

        console.log(
            `[HealingEngine] rootCause: ${analysis.rootCause} (rootCauseConfidence: ${analysis.rootCauseConfidence})` +
            ` | patchType: ${analysis.patchType} (patchConfidence: ${analysis.patchConfidence})`
        );

        // ── Step B: Eligibility check ────────────────────────────────────────

        if (analysis.patchType === PatchType.MANUAL) {
            console.log(`[HealingEngine] MANUAL — ${analysis.rootCause} — ${analysis.reason}`);
            return {
                status:               "MANUAL",
                rootCause:            analysis.rootCause,
                patchType:            analysis.patchType,
                rootCauseConfidence:  analysis.rootCauseConfidence,
                patchConfidence:      analysis.patchConfidence,
                reason:               analysis.reason,
                retryCount:           attempt
            };
        }

        // ── Step C: Patch + verify + rerun ───────────────────────────────────

        let backupCreated = false;

        try {
            AIResponseValidator.validate(analysis, context.sourceFile);

            BackupManager.create(context.sourceFile);
            backupCreated = true;

            PatchApplier.applyToSource(context.sourceFile, analysis);
            PatchVerifier.verify(context.sourceFile, analysis.oldValue, analysis.newValue);

            const metadata: Metadata = JSON.parse(
                fs.readFileSync(
                    path.join(context.artifactFolder, frameworkConfig.metadataName),
                    "utf8"
                )
            );
            const testCommand = TestCommandBuilder.build(metadata);

            await TestRerunner.run(testCommand);

            console.log(
                `[HealingEngine] HEALED on attempt ${attempt}` +
                ` | ${analysis.oldValue} → ${analysis.newValue}`
            );
            return {
                status:               "HEALED",
                rootCause:            analysis.rootCause,
                patchType:            analysis.patchType,
                rootCauseConfidence:  analysis.rootCauseConfidence,
                patchConfidence:      analysis.patchConfidence,
                originalLocator:      analysis.oldValue,
                healedLocator:        analysis.newValue,
                sourceFile:           context.sourceFile,
                retryCount:           attempt
            };

        } catch (patchError) {
            const msg = (patchError as Error).message;
            console.error(
                `[HealingEngine] Patch/rerun failed on attempt ${attempt}/${maxRetries}: ${msg}`
            );

            if (backupCreated) {
                try {
                    BackupManager.restore(context.sourceFile);
                    console.log("[HealingEngine] Source restored from backup.");
                } catch (restoreError) {
                    console.error("[HealingEngine] CRITICAL: Could not restore backup:", restoreError);
                }
            }

            if (attempt === maxRetries) {
                console.log(`[HealingEngine] Max retries (${maxRetries}) exhausted.`);
                return {
                    status:               "FAILED",
                    rootCause:            analysis.rootCause,
                    patchType:            analysis.patchType,
                    rootCauseConfidence:  analysis.rootCauseConfidence,
                    patchConfidence:      analysis.patchConfidence,
                    reason:               `Patch/rerun failed: ${msg}`,
                    retryCount:           attempt
                };
            }

            return null;
        }
    }
}
