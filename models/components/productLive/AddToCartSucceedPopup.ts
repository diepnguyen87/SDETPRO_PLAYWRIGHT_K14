import { Locator, Page, TestInfo } from "@playwright/test";
import Component from "../Component.js";
import { selector } from "../SelectorDecorator.js";

@selector(".modal-content")
export default class AddToCartSucceedPopup extends Component {

    private title = this.componentLocator.getByRole('link', { name: 'Added' })
    private content = this.componentLocator.locator('.modal-body')
    private viewCartLink = this.componentLocator.getByRole('link', { name: 'View Cart' })
    private continueShoppingBtn = this.componentLocator.getByRole('button', { name: 'Continue Shopping' })

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async getTitle() {
        return await this.title.textContent()
    }

    public async getContent() {
        return await this.content.textContent();
    }

    public async clickViewCartLink() {
        await this.viewCartLink.click()
    }

    public async clickContinueShoppingBtn() {
        await this.continueShoppingBtn.click()
    }
}