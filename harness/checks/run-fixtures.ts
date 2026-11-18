// Regression tests for the arch-check rules: yarn harness:test
// Each harness/checks/fixtures/<virtual path>.fixture starts with "// expect: R1, R5" or "// expect: none";
// "R1=14" also requires exactly 14 R1 violations. The virtual path (without .fixture) decides which rules apply.
import fs from "node:fs";
import path from "node:path";
import { checkSource } from "./arch-check.js";
import { PROJECT_ROOT } from "./markdown.js";

const FIXTURES_DIR = path.join(PROJECT_ROOT, "harness", "checks", "fixtures");
const REGISTERED_PAGES = new Set(["HomePage"]);

function fixtureFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return fixtureFiles(full);
        return entry.name.endsWith(".fixture") ? [full] : [];
    });
}

let failures = 0;
for (const fixture of fixtureFiles(FIXTURES_DIR).sort()) {
    const virtualPath = path.relative(FIXTURES_DIR, fixture).replace(/\.fixture$/, "");
    const text = fs.readFileSync(fixture, "utf8");
    const header = /^\/\/ expect: (.+)$/m.exec(text)?.[1].trim() ?? "";
    const tokens = header === "none" ? [] : header.split(",").map(token => token.trim());
    const expectedCounts = new Map(tokens.map(token => {
        const [rule, count] = token.split("=");
        return [rule, count === undefined ? undefined : Number(count)] as const;
    }));
    const counts = new Map<string, number>();
    for (const violation of checkSource(virtualPath, text, REGISTERED_PAGES)) counts.set(violation.rule, (counts.get(violation.rule) ?? 0) + 1);

    const expected = [...expectedCounts.keys()].sort();
    const actual = [...counts.keys()].sort();
    const countsMatch = [...expectedCounts].every(([rule, count]) => count === undefined || counts.get(rule) === count);
    const ok = expected.join(",") === actual.join(",") && countsMatch;
    if (!ok) failures++;
    const shown = actual.map(rule => (expectedCounts.get(rule) !== undefined ? `${rule}=${counts.get(rule)}` : rule));
    console.log(`${ok ? "PASS" : "FAIL"} ${virtualPath} — expected [${tokens.join(", ")}], got [${shown.join(", ")}]`);
}

console.log(failures === 0 ? "All arch-check fixtures passed" : `${failures} fixture(s) failed`);
process.exit(failures === 0 ? 0 : 1);
