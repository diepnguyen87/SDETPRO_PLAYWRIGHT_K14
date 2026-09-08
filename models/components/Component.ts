import { Locator, Page, TestInfo } from "@playwright/test";
import SelfHealingSuccess from "../../ai/SelfHealingSuccess.js";
import HealingEngine from "../../ai/HealingEngine.js";
import ComponentFailureCollector from "../../ai/collectors/ComponentFailureCollector.js";

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
            try {
                const context = await ComponentFailureCollector.collect(
                    {
                        page:               this.page,
                        componentLocator:   this.componentLocator,
                        testInfo:           this.testInfo,
                        componentClassName: this.constructor.name
                    },
                    selectorStr,
                    e
                );
                const result = await HealingEngine.handle(context, this.testInfo);
                if (result.status === "HEALED") throw new SelfHealingSuccess();
            } catch (healingError) {
                if (healingError instanceof SelfHealingSuccess) throw healingError;
                console.error("[Component] Healing engine error:", healingError);
            }
            throw e;
        }
    }

    public async clickOnContinueBtn(): Promise<void> {
        await this.componentLocator.locator(this.continueBtnSel).scrollIntoViewIfNeeded();
        await this.withHealing(this.continueBtnSel, l => l.click());
        await this.componentLocator.locator(this.continueBtnSel).waitFor({ state: "hidden" });
    }
}
