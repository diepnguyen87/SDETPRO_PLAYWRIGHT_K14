import { Locator } from "@playwright/test";
import FooterColumnComponent from "./FooterColumnComponent.js";

export default class InformationColumnComponent extends FooterColumnComponent {
    public static selector: string = ".column.information"

    constructor(component: Locator) {
        super(component)
    }
}