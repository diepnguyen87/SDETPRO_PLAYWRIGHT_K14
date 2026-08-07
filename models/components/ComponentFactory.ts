import { Locator, Page, TestInfo } from "@playwright/test";
import Component from "./Component.js";

export class ComponentFactory {

    static create<T extends Component>(
        ComponentClass: new (...args: any[]) => T,
        page: Page,
        locator: Locator,
        testInfo: TestInfo
    ): T {
        const component = new ComponentClass(
            page,
            locator,
            testInfo
        );
        component.sourceFile = getSourceFile(ComponentClass);
        return component;
    }
}