// Architecture gate: machine-checkable rules from CLAUDE.md, with a baseline of pre-existing violations.
//   yarn harness:check-arch [files...] [--all] [--json] [--update-baseline]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { PROJECT_ROOT, isMainModule } from "./markdown.js";

export const BASELINE_FILE = path.join(PROJECT_ROOT, "harness", "checks", "arch-baseline.json");
const SCANNED_DIRS = ["models/", "test-flows/", "tests/web/"];
const PAGES_REGISTRY = path.join(PROJECT_ROOT, "config", "pages.json");

export const RULES = {
    R1: "no-direct-css-action: act/read/assert on a CSS/XPath locator only through withHealing() (getByRole/getByLabel may act directly)",
    R2: "no-css-locator-getter: do not return a CSS/XPath Locator from a component or page; expose a wait/read method through withHealing()",
    R3: "flow-no-raw-page-api: flows call page objects only; no this.page.*() call (expect(this.page) assertions are allowed)",
    R4: "spec-raw-api: specs only call page.goto() on the page/browser/context/request fixtures",
    R4b: "spec-no-page-objects: specs do not instantiate pages or components; they create flows",
    R5: "no-wait-for-timeout: use auto-waiting and web-first assertions instead of waitForTimeout()",
    R6: "spec-imports-fixture: specs import test from tests/fixtures/base.ts, not @playwright/test",
    R7: "test-data-access: read data through TestDataProvider (no direct test-data/{env}/*.json import, no require())",
    R8: "no-test-only: test.only / describe.only must not be committed",
    R9: "tag-from-constant: test titles use TAG from constant/Tag.ts, not literal @Smoke/@Regression/@Sanity",
    R10: "page-registered: every page class in models/pages/ is registered in config/pages.json",
} as const;
export type RuleId = keyof typeof RULES;

export type Violation = { rule: RuleId; file: string; line: number; snippet: string };

// Calls on a locator that act, read or wait — they must go through withHealing() when the locator is CSS/XPath.
// Locator-producing calls (locator, getBy*, first, nth, filter, all, ...) are not listed.
const LOCATOR_ACTIONS = new Set([
    "click", "dblclick", "tap", "fill", "type", "press", "pressSequentially", "clear", "check", "uncheck", "setChecked",
    "selectOption", "selectText", "hover", "focus", "blur", "dragTo", "setInputFiles", "scrollIntoViewIfNeeded",
    "textContent", "innerText", "innerHTML", "inputValue", "getAttribute", "allInnerTexts", "allTextContents",
    "isVisible", "isHidden", "isChecked", "isEnabled", "isDisabled", "isEditable", "count", "waitFor", "boundingBox",
    "evaluate", "evaluateAll", "screenshot",
]);
const CHAIN_PASSTHROUGH = new Set(["first", "last", "nth", "filter", "and", "or"]);
const SEMANTIC_LOCATORS = new Set(["getByRole", "getByLabel"]);
const FIXTURE_OBJECTS = new Set(["page", "browser", "context", "request"]);
const TEST_API_ALLOWED = new Set(["use", "skip", "fixme", "fail", "slow", "afterEach", "beforeEach", "afterAll", "beforeAll", "describe", "step", "info", "setTimeout"]);
const TAG_LITERAL = /@(Smoke|Regression|Sanity)\b/i;

type LocatorKind = "css" | "semantic" | "unknown";

function calleeName(call: ts.CallExpression): string | undefined {
    return ts.isPropertyAccessExpression(call.expression) ? call.expression.name.text : undefined;
}

function isThisMember(node: ts.Expression, name: string): boolean {
    return ts.isPropertyAccessExpression(node) && node.expression.kind === ts.SyntaxKind.ThisKeyword && node.name.text === name;
}

// const/let declared in the enclosing function body, so `const l = this.page.locator(x); l.click()` is resolved
function localInitializer(identifier: ts.Identifier): ts.Expression | undefined {
    let scope: ts.Node | undefined = identifier.parent;
    while (scope && !ts.isFunctionLike(scope) && !ts.isSourceFile(scope)) scope = scope.parent;
    if (!scope) return undefined;
    let found: ts.Expression | undefined;
    const visit = (node: ts.Node): void => {
        if (found) return;
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === identifier.text && node.initializer) {
            found = ts.isAwaitExpression(node.initializer) ? node.initializer.expression : node.initializer;
            return;
        }
        if (node !== scope && ts.isFunctionLike(node)) return;
        ts.forEachChild(node, visit);
    };
    ts.forEachChild(scope, visit);
    return found;
}

function locatorKind(expression: ts.Expression, depth = 0): LocatorKind {
    if (depth > 10) return "unknown";
    if (ts.isParenthesizedExpression(expression)) return locatorKind(expression.expression, depth + 1);
    if (isThisMember(expression, "componentLocator")) return "css";
    if (ts.isIdentifier(expression)) {
        const initializer = localInitializer(expression);
        return initializer ? locatorKind(initializer, depth + 1) : "unknown";
    }
    if (ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)) {
        const name = expression.expression.name.text;
        if (name === "locator") return "css";
        if (SEMANTIC_LOCATORS.has(name)) return "semantic";
        if (name.startsWith("getBy")) return "css";
        if (CHAIN_PASSTHROUGH.has(name)) return locatorKind(expression.expression.expression, depth + 1);
    }
    return "unknown";
}

function insideWithHealingCallback(node: ts.Node): boolean {
    for (let current = node.parent; current; current = current.parent) {
        if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && ts.isCallExpression(current.parent)) {
            if (calleeName(current.parent) === "withHealing" && current.parent.arguments[1] === current) return true;
        }
    }
    return false;
}

function enclosingClassOrFunctionReturnsLocator(node: ts.ReturnStatement): boolean {
    for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
        if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) return false;
        if (ts.isMethodDeclaration(current) || ts.isGetAccessorDeclaration(current)) return true;
    }
    return false;
}

function loadRegisteredPages(): Set<string> {
    try {
        return new Set((JSON.parse(fs.readFileSync(PAGES_REGISTRY, "utf8")) as Array<{ className: string }>).map(page => page.className));
    } catch {
        return new Set();
    }
}

export function checkSource(file: string, text: string, registeredPages: Set<string> = loadRegisteredPages()): Violation[] {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const isModel = file.startsWith("models/");
    const isFlow = file.startsWith("test-flows/");
    const isSpec = file.startsWith("tests/web/") && file.endsWith(".spec.ts");
    const isPage = /^models\/pages\/\w+Page\.ts$/.test(file);
    const violations: Violation[] = [];

    const add = (rule: RuleId, node: ts.Node) => {
        const snippet = node.getText(source).replace(/\s+/g, " ").trim().slice(0, 160);
        violations.push({ rule, file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, snippet });
    };

    const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node)) {
            const name = calleeName(node);
            const target = ts.isPropertyAccessExpression(node.expression) ? node.expression.expression : undefined;

            // R1 — action on a CSS locator, or expect() on one
            if ((isModel || isFlow || isSpec) && name && target && LOCATOR_ACTIONS.has(name) && locatorKind(target) === "css" && !insideWithHealingCallback(node)) {
                add("R1", node);
            }
            if ((isModel || isFlow || isSpec) && ts.isIdentifier(node.expression) && node.expression.text === "expect" && node.arguments[0] && locatorKind(node.arguments[0]) === "css") {
                add("R1", node);
            }

            // R3 — raw page API in a flow (waitForTimeout is reported as R5)
            if (isFlow && target && isThisMember(target, "page") && name && name !== "waitForTimeout") add("R3", node);

            // R4 — raw fixture API in a spec
            if (isSpec && target && ts.isIdentifier(target) && FIXTURE_OBJECTS.has(target.text) && name) {
                if (!(target.text === "page" && name === "goto") && name !== "waitForTimeout") add("R4", node);
            }

            // R5
            if (name === "waitForTimeout") add("R5", node);

            // R7 — require()
            if (ts.isIdentifier(node.expression) && node.expression.text === "require" && file !== "test-data/TestDataProvider.ts") add("R7", node);

            // R9 — literal tag in a test title
            if (isSpec && node.arguments[0] && (ts.isIdentifier(node.expression) && node.expression.text === "test" || name !== undefined && target && ts.isIdentifier(target) && target.text === "test" && (name === "describe" || name === "only"))) {
                const title = node.arguments[0];
                const literalText = ts.isStringLiteral(title) || ts.isNoSubstitutionTemplateLiteral(title)
                    ? title.text
                    : ts.isTemplateExpression(title) ? [title.head.text, ...title.templateSpans.map(span => span.literal.text)].join(" ") : "";
                if (TAG_LITERAL.test(literalText)) add("R9", title);
            }
        }

        // R8 — test.only / test.describe.only
        if (isSpec && ts.isPropertyAccessExpression(node) && node.name.text === "only") {
            const owner = node.expression;
            if (ts.isIdentifier(owner) && owner.text === "test" || ts.isPropertyAccessExpression(owner) && owner.name.text === "describe") add("R8", node);
        }

        // R4 — other test.* APIs are not raw page API; nothing to do. R4b — page objects created in a spec
        if (isSpec && ts.isNewExpression(node) && ts.isIdentifier(node.expression) && /(Page|Component)$/.test(node.expression.text)) add("R4b", node);

        // R2 — getter returning a CSS locator
        if (isModel && ts.isReturnStatement(node) && node.expression && enclosingClassOrFunctionReturnsLocator(node) && locatorKind(node.expression) === "css") {
            add("R2", node);
        }

        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const from = node.moduleSpecifier.text;
            // R6
            if (isSpec && from === "@playwright/test") {
                const named = node.importClause?.namedBindings;
                if (named && ts.isNamedImports(named) && named.elements.some(element => (element.propertyName ?? element.name).text === "test")) add("R6", node);
            }
            // R7 — direct environment JSON import
            if (/test-data\/(sit|uat)\/.*\.json$/.test(from) && file !== "test-data/TestDataProvider.ts") add("R7", node);
        }

        // R10 — page class missing from config/pages.json
        if (isPage && ts.isClassDeclaration(node) && node.name && node.name.text !== "BasePage" && !registeredPages.has(node.name.text)) {
            add("R10", node.name);
        }

        ts.forEachChild(node, visit);
    };

    visit(source);
    return violations;
}

// ---------- files, baseline, CLI ----------

function git(args: string[]): string[] {
    return execFileSync("git", args, { cwd: PROJECT_ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
}

function isScanned(file: string): boolean {
    return file.endsWith(".ts") && SCANNED_DIRS.some(dir => file.startsWith(dir));
}

export function changedFiles(): string[] {
    const files = new Set([...git(["diff", "--name-only", "HEAD"]), ...git(["ls-files", "--others", "--exclude-standard"])]);
    return [...files].filter(file => isScanned(file) && fs.existsSync(path.join(PROJECT_ROOT, file)));
}

function allFiles(): string[] {
    return git(["ls-files", "--cached", "--others", "--exclude-standard", ...SCANNED_DIRS]).filter(isScanned);
}

const keyOf = (violation: Violation) => `${violation.rule}|${violation.file}|${violation.snippet}`;

type Baseline = Record<string, number>;

function loadBaseline(): Baseline {
    return fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")) : {};
}

// Violations not covered by the baseline (a snippet that appears more often than recorded counts as new)
export function newViolations(violations: Violation[], baseline: Baseline = loadBaseline()): Violation[] {
    const remaining = { ...baseline };
    return violations.filter(violation => {
        const key = keyOf(violation);
        if ((remaining[key] ?? 0) > 0) {
            remaining[key]--;
            return false;
        }
        return true;
    });
}

export function checkFiles(files: string[]): Violation[] {
    const registeredPages = loadRegisteredPages();
    return files.flatMap(file => checkSource(file, fs.readFileSync(path.join(PROJECT_ROOT, file), "utf8"), registeredPages));
}

function main(): void {
    const args = process.argv.slice(2);
    const asJson = args.includes("--json");

    if (args.includes("--update-baseline")) {
        const baseline: Baseline = {};
        for (const violation of checkFiles(allFiles())) baseline[keyOf(violation)] = (baseline[keyOf(violation)] ?? 0) + 1;
        const sorted = Object.fromEntries(Object.entries(baseline).sort(([a], [b]) => a.localeCompare(b)));
        fs.writeFileSync(BASELINE_FILE, JSON.stringify(sorted, null, 2) + "\n");
        console.log(`Baseline written: ${path.relative(PROJECT_ROOT, BASELINE_FILE)} (${Object.values(sorted).reduce((a, b) => a + b, 0)} violation(s))`);
        return;
    }

    const explicit = args.filter(arg => !arg.startsWith("--")).map(file => path.relative(PROJECT_ROOT, path.resolve(PROJECT_ROOT, file)));
    const files = args.includes("--all") ? allFiles() : explicit.length > 0 ? explicit.filter(isScanned) : changedFiles();
    const all = checkFiles(files);
    const fresh = newViolations(all);

    if (asJson) {
        console.log(JSON.stringify({ files: files.length, baselined: all.length - fresh.length, violations: fresh }, null, 2));
    } else if (fresh.length === 0) {
        console.log(`PASSED arch-check — ${files.length} file(s), ${all.length - fresh.length} baselined violation(s)`);
    } else {
        console.log(`FAILED arch-check — ${fresh.length} new violation(s) in ${files.length} file(s):`);
        for (const violation of fresh) {
            console.log(`  - ${violation.file}:${violation.line} [${violation.rule}] ${violation.snippet}`);
            console.log(`      ${RULES[violation.rule]}`);
        }
    }
    process.exit(fresh.length === 0 ? 0 : 1);
}

if (isMainModule(import.meta.url)) main();
