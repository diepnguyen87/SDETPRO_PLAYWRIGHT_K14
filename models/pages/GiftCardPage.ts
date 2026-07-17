import { Page } from "@playwright/test";
import BasePage from "./BasePage";

export default class GiftCardPage extends BasePage{
    constructor(page:Page){
        super(page)
    }
}