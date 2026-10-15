import { TestEnv, testEnv } from "../config/environment.config.js";
import sitCheapComputer from "./sit/CheapComputer.json" with { type: "json" };
import sitLogin from "./sit/LoginData.json" with { type: "json" };
import sitRandomCheapComputer from "./sit/RandomCheapComputer.json" with { type: "json" };
import sitRandomStandardComputer from "./sit/RandomStandardComputer.json" with { type: "json" };
import sitRegister from "./sit/RegisterData.json" with { type: "json" };
import sitStandardComputer from "./sit/StandardComputer.json" with { type: "json" };
import sitBillingAddress from "./sit/checkout/BillingAddressData.json" with { type: "json" };
import sitShippingMethod from "./sit/checkout/ShippingMethodData.json" with { type: "json" };
import sitTermsOfServiceWarning from "./sit/checkout/TermsOfServiceWarningData.json" with { type: "json" };

const sitData = {
    cheapComputer: sitCheapComputer,
    login: sitLogin,
    randomCheapComputer: sitRandomCheapComputer,
    randomStandardComputer: sitRandomStandardComputer,
    register: sitRegister,
    standardComputer: sitStandardComputer,
    billingAddress: sitBillingAddress,
    shippingMethod: sitShippingMethod,
    termsOfServiceWarning: sitTermsOfServiceWarning,
};

export type TestData = typeof sitData;

// UAT data is not provided yet: add the same files under test-data/uat/ and register them here
const dataSets: Record<TestEnv, TestData | undefined> = {
    sit: sitData,
    uat: undefined,
};

const selectedData = dataSets[testEnv];

if (!selectedData) {
    throw new Error(
        `No test data registered for TEST_ENV=${testEnv}. ` +
        `Add JSON files under test-data/${testEnv}/ and register them in test-data/TestDataProvider.ts`
    );
}

export const testData: TestData = selectedData;
