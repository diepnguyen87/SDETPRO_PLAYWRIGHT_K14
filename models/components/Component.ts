import { Locator, Page, TestInfo } from "@playwright/test";
import { FailedLocatorManager } from "../pages/FailedLocatorManager.js";
import fs from 'fs';
import path from "path";
import { frameworkConfig } from "../../config/framework.config.js";
import AIAnalyzer from "../../ai/AIAnalyzer.js";
import SourceCodeCollector from "../../ai/SourceCodeCollector.js";
import PatchApplier from "../../ai/PatchApplier.js";
import AIResponseValidator from "../../ai/AIResponseValidator.js";
import BackupManager from "../../ai/BackupManager.js";
import PatchVerifier from "../../ai/PatchVerifier.js";
import TestRerunner from "../../ai/TestRerunner.js";
import TestCommandBuilder from "../../ai/TestCommandBuilder.js";
import { Metadata } from "openai/resources";
import SelfHealingSuccess from "../../ai/SelfHealingSuccess.js";

export type ComponentConstructor<T extends Component> = new (component: Locator) => T
export default class Component {

    private continueBtnSel = "input[value='Continue']"
    protected sourceFile!: string;

    constructor(protected page: Page, protected componentLocator: Locator, protected testInfo: TestInfo) {
        this.page = page;
        this.componentLocator = componentLocator;
    }

    /*** COMMON ACTION ***/
    protected async withHealing<T>(
        selectorStr: string,
        action: (locator: Locator) => Promise<T>
    ): Promise<T> {
        const locator = this.componentLocator.locator(selectorStr);
        try {
            return await action(locator);
        } catch (e) {
            const healed = await this.selfHealingLocator(selectorStr, e);
            if (healed) throw new SelfHealingSuccess();
            throw e;
        }
    }

    public async clickOnContinueBtn(): Promise<void> {
        await this.componentLocator.locator(this.continueBtnSel).scrollIntoViewIfNeeded();
        await this.withHealing(this.continueBtnSel, l => l.click());
        await this.componentLocator.locator(this.continueBtnSel).waitFor({ state: "hidden" });
    }

    private async collectFailureArtifacts(locatorStr: string, error: unknown): Promise<string> {
        FailedLocatorManager.set(locatorStr);

        const folder = path.join(
            frameworkConfig.artifactFolder,
            this.testInfo.project.name,
            this.testInfo.title.replace(/\W+/g, "_")
        );
        fs.mkdirSync(folder, { recursive: true });

        const componentName = this.constructor.name;
        const sourceFile = SourceCodeCollector.find(componentName);
        fs.copyFileSync(
            sourceFile,
            path.join(folder, frameworkConfig.componentName)
        );

        await this.componentLocator.screenshot({
            path: path.join(folder, frameworkConfig.screenshotName)
        });

        fs.writeFileSync(
            path.join(folder, frameworkConfig.domName),
            await this.componentLocator.innerHTML(),
            "utf8"
        );

        const metadata: Metadata = {
            testName: this.testInfo.title,
            testFile: path.relative(process.cwd(), this.testInfo.file),
            browser: this.testInfo.project.name,
            error: error instanceof Error ? error.message : String(error),
            url: this.page.url(),
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

    private async selfHealingLocator(locatorStr: string, e: unknown): Promise<boolean> {
        const folder = await this.collectFailureArtifacts(locatorStr, e);
        const aiAnalyzer = new AIAnalyzer();
        const analysis = await aiAnalyzer.analyze(folder)

        //attach into playwright report
        await this.testInfo.attach(
            "AI Analysis",
            {
                path: path.join(folder, frameworkConfig.aiResponseName_json),
                contentType: "application/json"
            }
        );

        const sourceFile = SourceCodeCollector.find(this.constructor.name);
        AIResponseValidator.validate(analysis, sourceFile);
        BackupManager.create(sourceFile);
        PatchApplier.applyToSource(sourceFile, analysis);
        PatchVerifier.verify(sourceFile, analysis.oldLocator, analysis.newLocator);

        const metadata: Metadata = JSON.parse(
            fs.readFileSync(
                path.join(folder, frameworkConfig.metadataName),
                "utf8"
            )
        );
        const testCommand = TestCommandBuilder.build(metadata);
        try {
            await TestRerunner.run(testCommand);
            return true;
        } catch {
            return false;
        }
    }
}