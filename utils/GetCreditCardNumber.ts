import { request } from "@playwright/test";
import { CreditCard, CreditCardType } from "../type/DataType.js";

export async function getCreditCardNumber(creditCardType: CreditCardType): Promise<CreditCard>{
    const apiContext = await request.newContext()
    let response = await apiContext.get("https://randommer.io/api/Card?", {
        params: {type: creditCardType},
        headers: {
            'X-Api-Key': '61f520a2e9e648b3831022888378a791'
        }
    })

    if (!response.ok()) {
        throw new Error(`Failed to fetch credit card number: ${response.status()} ${response.statusText()}`);
    }

    return await response.json();
}