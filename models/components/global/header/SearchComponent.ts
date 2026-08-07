import { Locator, Page, TestInfo } from "@playwright/test";
import Component from "../../Component.js";

export default class SearchComponent extends Component {

    public static selector = "div.search-box"
    private searchInputSel = "input#small-searchterms"
    private searchBtnSel = ".search-box-button"

    constructor(page: Page, componentLocator: Locator, testInfo: TestInfo) {
        super(page, componentLocator, testInfo)
    }

    searchInput(): Locator {
        return this.componentLocator.locator(this.searchInputSel);
    }

    searchBtn(): Locator {
        return this.componentLocator.locator(this.searchBtnSel)
    }
}