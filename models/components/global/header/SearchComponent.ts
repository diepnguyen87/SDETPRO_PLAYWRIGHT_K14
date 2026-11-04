import { Locator, Page, TestInfo } from "@playwright/test";
import { selector } from "../../SelectorDecorator.js";
import Component from "../../Component.js";

@selector("div.search-box")
export default class SearchComponent extends Component {

    private searchInputSel = "input#small-searchterms"
    private searchBtnSel = ".search-box-button"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    public async inputSearchTerm(term: string): Promise<void> {
        await this.withHealing(this.searchInputSel, l => l.fill(term));
    }

    public async clickSearchBtn(): Promise<void> {
        await this.withHealing(this.searchBtnSel, l => l.click());
    }
}