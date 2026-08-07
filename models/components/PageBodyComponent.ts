import { Locator, Page, TestInfo } from "@playwright/test";
import ProductGridComponent from "./ProductGridComponent.js";
import { selector } from "./SelectorDecorator.js";
import Component from "./Component.js";

@selector(".page-body")
export default class PageBodyComponent extends Component {

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    productGridComp(): ProductGridComponent {
        return new ProductGridComponent(this.componentLocator.locator(ProductGridComponent.selector))
    }
}