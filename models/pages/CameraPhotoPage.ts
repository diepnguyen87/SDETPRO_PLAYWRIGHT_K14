import { Page } from "@playwright/test";
import BasePage from "./BasePage";

export default class CameraPhotoPage extends BasePage{
    constructor(page: Page){
        super(page)
    }
}