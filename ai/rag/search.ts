// Usage: yarn rag:search "<query>" [--top <n>] [--type <type>]
// Prints the chunks closest to the query, to check retrieval quality.
import "dotenv/config";
import QdrantStore from "./QdrantStore.js";
import Retriever from "./Retriever.js";
import { CHUNK_TYPES, ChunkType } from "./RagTypes.js";

const USAGE = `Usage: yarn rag:search "<query>" [--top <n>] [--type <${CHUNK_TYPES.join(" | ")}>]`;
const EXCERPT_LINES = 3;

type Options = { query: string; topK: number; type?: ChunkType };

function parseArgs(args: string[]): Options | string {
    const words: string[] = [];
    let topK = 5;
    let type: ChunkType | undefined;
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        if (arg === "--top") {
            topK = Number(args[++index]);
            if (!Number.isInteger(topK) || topK < 1) return "--top needs a positive integer";
        } else if (arg === "--type") {
            const value = args[++index];
            if (!(CHUNK_TYPES as readonly string[]).includes(value)) return `Unknown --type "${value ?? ""}"`;
            type = value as ChunkType;
        } else if (arg.startsWith("--")) {
            return `Unknown option ${arg}`;
        } else {
            words.push(arg);
        }
    }
    const query = words.join(" ").trim();
    if (!query) return "Missing query";
    return { query, topK, type };
}

async function main(): Promise<number> {
    const options = parseArgs(process.argv.slice(2));
    if (typeof options === "string") {
        console.error(`${options}\n${USAGE}`);
        return 2;
    }

    const store = new QdrantStore();
    await store.assertReachable();
    const results = await new Retriever(store).retrieve(options.query, { topK: options.topK, type: options.type });
    if (results.length === 0) console.log("No results (run `yarn rag:ingest` first?)");

    for (const result of results) {
        console.log(`${result.score.toFixed(3)} | ${result.type} | ${result.source}:${result.startLine}-${result.endLine} | ${result.title}`);
        const excerpt = result.text.split("\n").filter(line => line.trim()).slice(1, 1 + EXCERPT_LINES);
        for (const line of excerpt) console.log(`        ${line.trim().slice(0, 140)}`);
    }
    return 0;
}

main().then(
    code => process.exit(code),
    error => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    },
);
