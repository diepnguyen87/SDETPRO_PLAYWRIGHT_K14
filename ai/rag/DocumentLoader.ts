import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { ChunkType, SourceDocument } from "./RagTypes.js";

type SourceRule = {
    root: string;
    recursive: boolean;
    accept: (relativePath: string) => boolean;
    type: (relativePath: string) => ChunkType;
};

const KNOWLEDGE_TYPES: Record<string, ChunkType> = {
    requirements: "requirement",
    "business-rules": "business-rule",
    defects: "defect",
};

// The only files RAG may read; everything else (test-data/, ai/, harness/, Day19–24 …) is never loaded
const SOURCE_RULES: SourceRule[] = [
    {
        root: "knowledge-base",
        recursive: true,
        accept: p => p.endsWith(".md") && path.posix.basename(p) !== "_TEMPLATE.md",
        type: p => KNOWLEDGE_TYPES[p.split("/")[1]] ?? "knowledge",
    },
    { root: "tests/web/Day25", recursive: false, accept: p => p.endsWith(".spec.ts"), type: () => "spec" },
    { root: "models/pages", recursive: false, accept: p => p.endsWith(".ts"), type: () => "page" },
    { root: "models/components", recursive: true, accept: p => p.endsWith(".ts"), type: () => "component" },
    { root: "test-flows", recursive: true, accept: p => p.endsWith(".ts"), type: () => "flow" },
    { root: "config", recursive: false, accept: p => p === "config/pages.json", type: () => "page-registry" },
];

const SECRET_PATH = /(^|\/)(\.env(\.[\w-]+)?|\.auth)(\/|$)/;

export default class DocumentLoader {

    constructor(private readonly projectRoot: string = process.cwd()) {}

    public load(): SourceDocument[] {
        const documents: SourceDocument[] = [];
        for (const rule of SOURCE_RULES) {
            for (const source of this.listFiles(rule.root, rule.recursive)) {
                if (SECRET_PATH.test(source) || !rule.accept(source)) continue;
                const content = fs.readFileSync(path.join(this.projectRoot, source), "utf8");
                documents.push({ source, type: rule.type(source), content, fileHash: sha256(content) });
            }
        }
        return documents.sort((a, b) => a.source.localeCompare(b.source));
    }

    private listFiles(root: string, recursive: boolean): string[] {
        const absoluteRoot = path.join(this.projectRoot, root);
        if (!fs.existsSync(absoluteRoot)) return [];
        const files: string[] = [];
        for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
            const relativePath = `${root}/${entry.name}`;
            if (entry.isDirectory()) {
                if (recursive) files.push(...this.listFiles(relativePath, true));
            } else if (entry.isFile()) {
                files.push(relativePath);
            }
        }
        return files;
    }
}

export function sha256(text: string): string {
    return createHash("sha256").update(text).digest("hex");
}
