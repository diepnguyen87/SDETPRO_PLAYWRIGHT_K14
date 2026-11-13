// Regression tests for the arch-check rules: yarn harness:test
// Each harness/checks/fixtures/<virtual path>.fixture starts with "// expect: R1, R5" or "// expect: none";
// the virtual path (without .fixture) decides which rules apply.
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
    const expected = header === "none" ? [] : header.split(",").map(rule => rule.trim()).sort();
    const actual = [...new Set(checkSource(virtualPath, text, REGISTERED_PAGES).map(violation => violation.rule))].sort();
    const ok = expected.join(",") === actual.join(",");
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"} ${virtualPath} — expected [${expected.join(", ")}], got [${actual.join(", ")}]`);
}

console.log(failures === 0 ? "All arch-check fixtures passed" : `${failures} fixture(s) failed`);
process.exit(failures === 0 ? 0 : 1);
