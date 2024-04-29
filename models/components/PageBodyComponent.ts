import { Locator } from "@playwright/test";
import ProductItemComponent from "./ProductItemComponent.js";
import ProductGridComponent from "./ProductGridComponent.js";

export default class PageBodyComponent {
    public static selector:string = ".page-body"

    constructor(private component: Locator){
        this.component = component
    }

    productGridComp():ProductGridComponent{
        return new ProductGridComponent(this.component.locator(ProductGridComponent.selector))
    }
}