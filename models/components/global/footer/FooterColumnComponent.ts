import { Locator } from "@playwright/test";

export default class FooterColumnComponent {

    private titleSel: string = "h3"
    private linksSel: string = "li>a"

    constructor(private component: Locator) {
        this.component = component
        this.component.scrollIntoViewIfNeeded()
    }

    title(): Locator {
        return this.component.locator(this.titleSel)
    }

    async links(): Promise<Locator[]> {
        return await this.component.locator(this.linksSel).all()
    }

}