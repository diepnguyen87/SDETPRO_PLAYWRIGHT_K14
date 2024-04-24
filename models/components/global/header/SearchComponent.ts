import { Locator } from "@playwright/test";

export default class SearchComponent {

    public static selector = "div.search-box"
    private searchInputSel = "input#small-searchterms"
    private searchBtnSel = ".search-box-button"

    constructor(private component: Locator) {
        this.component = component
    }

    searchInput(): Locator {
        return this.component.locator(this.searchInputSel);
    }

    searchBtn(): Locator {
        return this.component.locator(this.searchBtnSel)
    }

}