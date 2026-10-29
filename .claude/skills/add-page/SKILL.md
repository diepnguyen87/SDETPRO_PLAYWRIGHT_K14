---
name: add-page
description: Create a new Page Object and its Components for a page of the app under test, and register the page in test-data/pages.json. Use when asked to add, model, or automate a new page or page section.
---

# Add a Page Object

Input: page name, slug (e.g. `/contactus`), and the page areas the tests must interact with.

## 1. Reuse before creating
- Search `models/pages/`, `models/components/` (including `global/`, `checkout/`, `computer/`, `cart/`) and `test-data/pages.json`.
- If a page or component already covers the need, extend or reuse it. Header, footer, top menu, notification and page body are already exposed by `BasePage` — never duplicate those accessors.

## 2. Inspect the real page
- If the `playwright` MCP server is connected, navigate to `envConfig.baseURL` + slug and take a snapshot to read roles, labels and placeholders. Close the browser when done.
- Otherwise ask for the HTML or a description. Do not guess selectors.

## 3. Create the Component — `models/components/<Name>Component.ts`
Reference implementation: `models/components/checkout/BillingAddressComponent.ts`.
- `export default class <Name>Component extends Component`, decorated with `@selector("<root css>")` from `./SelectorDecorator.js`.
- Constructor `(page: Page, componentLocator: Locator, testInfo: TestInfo)` calling `super(page, componentLocator, testInfo)`.
- Locators are class properties, never inline in methods. Priority: `getByRole` > `getByLabel` > `getByPlaceholder` > `getByTestId` > CSS > XPath.
- `getByRole` / `getByLabel` locators may call actions directly.
- Every CSS/XPath interaction goes through `this.withHealing(this.fooSel, l => l.click())` — never `this.componentLocator.locator(sel).click()` / `.fill()` / `.textContent()`.
- Methods return data or `Promise<void>`; no assertions inside components.

## 4. Create the Page — `models/pages/<Name>Page.ts`
Reference implementation: `models/pages/LoginPage.ts`.
- `export default class <Name>Page extends BasePage`, constructor `(page: Page, testInfo: TestInfo)`.
- One accessor per component: `fooComp(): FooComponent { return new FooComponent(this.page, this.page.locator(FooComponent.selectorValue), this.testInfo) }`.
- Page-level CSS/XPath interactions use `this.withHealing(...)`.

## 5. Register the page
Add `{ "pageName": "<Name> Page", "slug": "<slug>", "className": "<Name>Page" }` to `test-data/pages.json`. `className` must match the file name, because `BaseFlow.createPageInstance()` imports `../models/pages/<className>.js`.

## 6. Verify
- The typecheck hook runs after each edit — fix every reported error.
- `yarn playwright test --list --config=playwright.config.web.js` must load without errors.
- Do not create a TestFlow or spec unless asked; report the new files and accessors instead.
