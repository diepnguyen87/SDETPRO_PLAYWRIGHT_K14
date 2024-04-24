import { Locator } from "@playwright/test";
import ProductItemComponent from "./ProductItemComponent";
import ProductGridComponent from "./ProductGridComponent";

export default class PageBodyComponent {
    public static selector:string = ".page-body"

    constructor(private component: Locator){
        this.component = component
    }

    productGridComp():ProductGridComponent{
        return new ProductGridComponent(this.component.locator(ProductGridComponent.selector))
    }
}