import { request } from "@playwright/test";
import { CreditCard, CreditCardType } from "../type/DataType.js";

export async function getCreditCardNumber(creditCardType: CreditCardType): Promise<CreditCard> {
    const apiContext = await request.newContext()
    try {
        let response = await apiContext.get("https://randommer.io/api/Card?", {
            params: { type: creditCardType },
            headers: {
                'X-Api-Key': process.env.RANDOMMER_API_KEY!,
            },
            timeout: 15000,
        })

        if (!response.ok()) {
            throw new Error(`Failed to fetch credit card number: ${response.status()} ${response.statusText()}`);
        }

        return await response.json();
    }
    finally {
        await apiContext.dispose();
    }
}