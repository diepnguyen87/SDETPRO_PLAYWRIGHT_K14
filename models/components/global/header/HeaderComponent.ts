import { Locator } from "@playwright/test";
import SearchComponent from "./SearchComponent.js";
import { selector } from "../../SelectorDecortor.js";

@selector(".header")
export default class HeaderComponent {

    // public static selector:string = ".header"

    constructor(private component: Locator){
        this.component = component;
    }

    searchComp(): SearchComponent {
        return new SearchComponent(this.component.locator(SearchComponent.selector));
    }
}