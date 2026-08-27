import BaseFlow from "./BaseFlow.js";
import { expect, Page, TestInfo } from "@playwright/test"
import ProductPageLive from "../models/pages/ProductPageLive.js";
import ProductImageWrapperComponent from "../models/components/productLive/ProductImageWrapperComponent.js";
import AddToCartSucceedPopup from "../models/components/productLive/AddToCartSucceedPopup.js";

export default class ProductFlowLive extends BaseFlow {
   
    private productPage: ProductPageLive;
    private productImageWrapperComp: ProductImageWrapperComponent | undefined;
    private addToCartPopup: AddToCartSucceedPopup | undefined;

    constructor(page: Page, testInfo: TestInfo) {
        super(page, testInfo)
        this.productPage = new ProductPageLive(page, testInfo);
    }

    public async addToCart(productName: string) {
        this.productImageWrapperComp = this.productPage.productListComponent().productImageWrapperComponentByName(productName);
        await this.productImageWrapperComp.clickAddToCart();

        this.addToCartPopup = this.productPage.addToCartSucceedPopup();
        await this.addToCartPopup.clickContinueShoppingBtn();
    }

    public async addToCartWithManyProduct(productListData: any[]) {
        if (!productListData || productListData.length === 0) {
            throw new Error("Product List Data is empty");
        }
        for (const productItem of productListData) {
            await this.addToCart(productItem.productName)
        }
    }

    public verifyAddToCartSucceed() {
        this.addToCartPopup = this.productPage.addToCartSucceedPopup();
        this.addToCartPopup.getTitle();
        expect(this.addToCartPopup.getTitle()).toEqual('Added');
        expect(this.addToCartPopup.getContent()).toContainEqual('Your product has been added to cart.')
    }

    public verifyProductsInViewCart() {

    }

}