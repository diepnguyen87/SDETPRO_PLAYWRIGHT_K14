import { Page } from "@playwright/test";
import BasePage from "../models/pages/BasePage.js";
import PageModel from "../test-data/model/Page.js";
import { parseJsonStringToObject, readJsonFile } from "../utils/DataObjectBuilder.js";

type PageConstructor<T extends BasePage> = new (page: Page) => T

export default class BaseFlow {

    protected static pageList: PageModel[] = []

    constructor(protected page: Page) {
        this.page = page
    }

    private initPageInstance<T extends BasePage>(className: PageConstructor<T>): T {
        return new className(this.page)
    }

    public async createPageInstance(className: string) {
        const dynamicImport = await import(`../models/pages/${className}`)
        const Class = dynamicImport.default

        if (Class) {
            return this.initPageInstance(Class)
        } else {
            throw new Error(`Class '${className}' not found`);
        }
    }

    private async getPageList() {
        if (BaseFlow.pageList.length === 0) {
            let jsonString = await readJsonFile("D:/HongDiep/SDETPRO_PLAYWRIGHT_K14/test-data/pages.json")
            BaseFlow.pageList = await parseJsonStringToObject(jsonString, PageModel)
        }
        if (BaseFlow.pageList.length === 0) {
            throw new Error(`File pages.json is empty. Please check again!`)
        }
    }

    public async getClassNameBySlug(slug: string): Promise<string> {
        await this.getPageList()
        console.log(typeof BaseFlow.pageList);
        
        for (const pageObj of BaseFlow.pageList) {
            if (pageObj["slug"] === slug) {
                return pageObj["className"];
            }
        }
        throw new Error(`The slug ${slug} does not map with any class name`)
    }
}