import { Locator } from "@playwright/test";
import ProductItemComponent from "./ProductItemComponent.js";
import ProductGridComponent from "./ProductGridComponent.js";
import { selector } from "./SelectorDecorator.js";

@selector(".page-body")
export default class PageBodyComponent {

    constructor(private component: Locator){
        this.component = component
    }

    productGridComp():ProductGridComponent{
        return new ProductGridComponent(this.component.locator(ProductGridComponent.selector))
    }
}