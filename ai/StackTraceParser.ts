import path from "path";

export interface ParsedFrame {
    sourceFile:  string;
    line:        number;
    column:      number;
    className?:  string;
    methodName?: string;
}

/**
 * Priority order for source frame search.
 * The parser returns the first stack frame whose file path matches
 * one of these prefixes, in the order listed.
 */
const SEARCH_PRIORITY: readonly string[] = [
    "models/components/",
    "models/pages/",
    "test-flows/",
    "tests/"
];

/**
 * Matches two Node.js stack trace line formats:
 *
 *   at Qualifier (file.ts:L:C)   — named: groups 1,2,3,4
 *   at file.ts:L:C               — anonymous: groups 5,6,7
 *
 * "async" is stripped. Qualifier covers ClassName.method, Object.<anonymous>, etc.
 */
const FRAME_RE =
    /^\s+at\s+(?:async\s+)?(?:([\w.<>]+)\s+\((.+):(\d+):(\d+)\)|(.+):(\d+):(\d+))/;

export default class StackTraceParser {

    /**
     * Find the most relevant application source frame in a stack trace.
     * Returns null when no matching frame is found.
     */
    public static parse(stackTrace: string): ParsedFrame | null {
        const lines = stackTrace.split("\n");

        for (const prefix of SEARCH_PRIORITY) {
            const frame = this.findFrame(lines, prefix);
            if (frame) return frame;
        }

        return null;
    }

    private static findFrame(lines: string[], prefix: string): ParsedFrame | null {
        for (const line of lines) {
            const match = FRAME_RE.exec(line);
            if (!match) continue;

            const qualifier = match[1];
            const filePath  = match[2] ?? match[5];
            const lineNum   = parseInt(match[3] ?? match[6]  ?? "", 10);
            const colNum    = parseInt(match[4] ?? match[7] ?? "", 10);

            if (!filePath || isNaN(lineNum) || isNaN(colNum)) continue;

            const normalized = this.normalize(filePath);

            // Use forward-slash comparison to work correctly on macOS/Linux
            if (!normalized.includes(prefix)) continue;

            let className:  string | undefined;
            let methodName: string | undefined;

            if (qualifier) {
                const dot = qualifier.lastIndexOf(".");
                if (dot !== -1) {
                    className  = qualifier.slice(0, dot);
                    methodName = qualifier.slice(dot + 1);
                } else {
                    className = qualifier;
                }
            }

            return { sourceFile: normalized, line: lineNum, column: colNum, className, methodName };
        }

        return null;
    }

    /**
     * Normalize a file path from a stack trace:
     * - Replace .js extension with .ts (TypeScript source lookup)
     * - Resolve relative paths against cwd
     */
    private static normalize(filePath: string): string {
        const tsPath = filePath.replace(/\.js$/, ".ts");
        if (path.isAbsolute(tsPath)) return tsPath;
        return path.resolve(process.cwd(), tsPath);
    }
}
