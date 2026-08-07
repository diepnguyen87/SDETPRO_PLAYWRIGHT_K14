import { Locator, Page, TestInfo } from "@playwright/test";
import { FailedLocatorManager } from "../pages/FailedLocatorManager.js";
import fs from 'fs';
import path from "path";
import { frameworkConfig } from "../../config/framework.config.js";
import { Metadata } from "../../ai/types.js";
import AIAnalyzer from "../../ai/AIAnalyzer.js";
import SourceCodeCollector from "../../ai/SourceCodeCollector.js";
import PatchGenerator from "../../ai/PatchGenerator.js";
import PatchApplier from "../../ai/PatchApplier.js";

export type ComponentConstructor<T extends Component> = new (component: Locator) => T
export default class Component {

    private continueBtnSel = "input[value='Continue']"
    protected sourceFile!: string;

    constructor(protected page: Page, protected componentLocator: Locator, protected testInfo: TestInfo) {
        this.page = page;
        this.componentLocator = componentLocator;
    }

    /*** COMMON ACTION ***/
    async click(locatorName: string, locator: Locator) {
        try {
            await locator.click();
        } catch (e) {
            await this.selfHealingLocator(locatorName, e)
            throw e;
        }
    }

    public async clickOnContinueBtn(): Promise<void> {
        const continueBtn = await this.componentLocator.locator(this.continueBtnSel)
        continueBtn.scrollIntoViewIfNeeded()
        await continueBtn.click()
        await continueBtn.waitFor({ state: "hidden" })
    }

    private async collectFailureArtifacts(locatorName: string, error: unknown): Promise<string> {
        FailedLocatorManager.set(locatorName);

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

    private async selfHealingLocator(locatorName: string, e: unknown) {
        const folder = await this.collectFailureArtifacts(locatorName, e);
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
        const backupFile = `${sourceFile}.bak`;
        fs.copyFileSync(
            sourceFile,
            backupFile
        );

        PatchApplier.applyToSource(sourceFile, analysis);
    }
}