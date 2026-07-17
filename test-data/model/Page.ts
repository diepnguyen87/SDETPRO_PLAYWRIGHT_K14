export default class Page {
    private pageName: string
    private slug: string
    private className: string

    constructor(){
        this.pageName = ""
        this.slug = ""
        this.className = ""
    }

    public getPageName() {
        return this.pageName;
    }

    public getSlug() {
        return this.slug;
    }

    public getClassName(){
        return this.className;
    }
}