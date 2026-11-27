import ts from "typescript";
import { Chunk, SourceDocument } from "./RagTypes.js";

const MAX_CHUNK_CHARS = 6000;

type Piece = { title: string; startLine: number; endLine: number; text: string; area?: string };

export function chunkDocument(document: SourceDocument): Chunk[] {
    let pieces: Piece[];
    if (document.source.endsWith(".md")) pieces = chunkMarkdown(document.content);
    else if (document.source.endsWith(".ts")) pieces = chunkTypeScript(document);
    else pieces = [wholeFile(document.source, document.content)];

    return pieces
        .flatMap(splitLongPiece)
        .map((piece, chunkIndex) => ({
            source: document.source,
            type: document.type,
            ...(piece.area ? { area: piece.area } : {}),
            title: piece.title,
            startLine: piece.startLine,
            endLine: piece.endLine,
            text: piece.text,
            fileHash: document.fileHash,
            chunkIndex,
        }));
}

// One chunk per "## " section, prefixed with the document title
function chunkMarkdown(content: string): Piece[] {
    const lines = content.split(/\r?\n/);
    const title = lines.find(line => line.startsWith("# "))?.slice(2).trim() ?? "";
    const area = /^- Area:\s*(.+?)\s*$/m.exec(content)?.[1];
    const pieces: Piece[] = [];
    let start = 0;
    const flush = (end: number) => {
        const body = lines.slice(start, end).join("\n").trim();
        const heading = lines[start].startsWith("## ") ? lines[start].slice(3).trim() : "";
        const hasContent = body.split("\n").some(line => line.trim() && !line.startsWith("#"));
        if (hasContent) {
            pieces.push({
                title: heading ? `${title} › ${heading}` : title,
                startLine: start + 1,
                endLine: end,
                text: body.startsWith("# ") ? body : `${title}\n\n${body}`,
                area,
            });
        }
    };
    lines.forEach((line, index) => {
        if (index > 0 && line.startsWith("## ")) {
            flush(index);
            start = index;
        }
    });
    flush(lines.length);
    return pieces;
}

// Specs: one chunk per test(...) call. Classes: one chunk per method, prefixed with the class context
function chunkTypeScript(document: SourceDocument): Piece[] {
    const sourceFile = ts.createSourceFile(document.source, document.content, ts.ScriptTarget.Latest, true);
    const lineOf = (position: number) => sourceFile.getLineAndCharacterOfPosition(position).line + 1;
    const pieces: Piece[] = [];

    if (document.type === "spec") {
        const visit = (node: ts.Node) => {
            if (isTestCall(node)) {
                const titleArg = node.arguments[0];
                const title = titleArg ? titleArg.getText(sourceFile).replace(/^[`'"]|[`'"]$/g, "") : "test";
                pieces.push({
                    title,
                    startLine: lineOf(node.getStart(sourceFile)),
                    endLine: lineOf(node.getEnd()),
                    text: `// ${document.source}\n${node.getText(sourceFile)}`,
                });
                return;
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    } else {
        sourceFile.forEachChild(node => {
            if (!ts.isClassDeclaration(node)) return;
            const className = node.name?.getText(sourceFile) ?? "default";
            const header = classHeader(node, sourceFile);
            const methods = node.members.filter(ts.isMethodDeclaration);
            if (methods.length === 0) {
                pieces.push({
                    title: className,
                    startLine: lineOf(node.getStart(sourceFile)),
                    endLine: lineOf(node.getEnd()),
                    text: `// ${document.source}\n${node.getText(sourceFile)}`,
                });
                return;
            }
            for (const method of methods) {
                pieces.push({
                    title: `${className}.${method.name.getText(sourceFile)}`,
                    startLine: lineOf(method.getStart(sourceFile)),
                    endLine: lineOf(method.getEnd()),
                    text: `// ${document.source}\n${header}\n\n${method.getText(sourceFile)}`,
                });
            }
        });
    }

    return pieces.length > 0 ? pieces : [wholeFile(document.source, document.content)];
}

function isTestCall(node: ts.Node): node is ts.CallExpression {
    if (!ts.isCallExpression(node)) return false;
    const callee = node.expression;
    if (ts.isIdentifier(callee)) return callee.text === "test";
    return ts.isPropertyAccessExpression(callee)
        && ts.isIdentifier(callee.expression)
        && callee.expression.text === "test"
        && ["only", "skip", "fixme", "fail"].includes(callee.name.text);
}

// Decorators (e.g. @selector), the class line and its property declarations
function classHeader(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): string {
    const decorators = (ts.getDecorators(node) ?? []).map(decorator => decorator.getText(sourceFile));
    const heritage = (node.heritageClauses ?? []).map(clause => clause.getText(sourceFile)).join(" ");
    const properties = node.members
        .filter(ts.isPropertyDeclaration)
        .map(property => `    ${property.getText(sourceFile)}`);
    return [...decorators, `class ${node.name?.getText(sourceFile) ?? "default"} ${heritage}`.trim() + " {", ...properties, "}"].join("\n");
}

function wholeFile(source: string, content: string): Piece {
    return { title: source, startLine: 1, endLine: content.split(/\r?\n/).length, text: `// ${source}\n${content}` };
}

// Line numbers of the parts are approximate: the chunk text carries a context prefix
function splitLongPiece(piece: Piece): Piece[] {
    if (piece.text.length <= MAX_CHUNK_CHARS) return [piece];
    const lines = piece.text.split("\n");
    const parts: Piece[] = [];
    let current: string[] = [];
    let currentStart = piece.startLine;
    let lineNumber = piece.startLine;
    const flush = () => {
        if (current.length === 0) return;
        parts.push({ ...piece, title: `${piece.title} (part ${parts.length + 1})`, startLine: Math.min(currentStart, piece.endLine), endLine: Math.min(lineNumber - 1, piece.endLine), text: current.join("\n") });
        current = [];
        currentStart = lineNumber;
    };
    for (const line of lines) {
        if (current.join("\n").length + line.length + 1 > MAX_CHUNK_CHARS) flush();
        current.push(line);
        lineNumber++;
    }
    flush();
    return parts;
}
