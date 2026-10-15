export const environments = {
    sit: { baseURL: "https://demowebshop.tricentis.com" },
    uat: { baseURL: "https://uat.demowebshop.tricentis.com" },
} as const;

export type TestEnv = keyof typeof environments;

const requestedEnv = process.env.TEST_ENV ?? "sit";

if (!(requestedEnv in environments)) {
    throw new Error(`Unsupported TEST_ENV: ${requestedEnv}. Allowed: ${Object.keys(environments).join(", ")}`);
}

export const testEnv = requestedEnv as TestEnv;
export const envConfig = environments[testEnv];
