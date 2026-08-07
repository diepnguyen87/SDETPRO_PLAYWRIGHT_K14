import { Metadata } from "./types.js";

export function buildPrompt(
    metadata: Metadata,
    html: string,
    component: string
): string {
    return `
        You are a Senior Automation Engineer.
        The following Playwright locator failed.
        ====================================
        Test Name:
        ${metadata.testName}

        ====================================
        Component Source:
        The locator is declared inside this component.
        Find the locator variable that should be updated.
        ${component}
        ====================================

        Browser:
        ${metadata.browser}

        Current Locator:
        ${metadata.failedLocator}

        Error:
        ${metadata.error}
        ====================================
        Below is the page DOM.
        ${html}
        ====================================
        Your task:
        1. Explain why the locator failed.
        2. Suggest the best Playwright locator.
        3. Explain why.
        4. Return confidence (0-100%).
        `;
}