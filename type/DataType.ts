export type CreditCardType = 'JCB' | 'Visa' | 'Discover' | 'AmericanExpress' | 'Mastercard';

export const cardType: Record<CreditCardType, string> = {
    JCB: "JCB",
    Visa: "Visa",
    Discover: "Discover",
    AmericanExpress: "Amex",
    Mastercard: "Master card",
};

export type CreditCard = {
    "type": string,
    "date": string,
    "fullName": string,
    "cardNumber": string,
    "cvv": string,
    "pin": string
}