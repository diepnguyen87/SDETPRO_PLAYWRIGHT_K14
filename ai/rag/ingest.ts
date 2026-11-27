// Usage: yarn rag:ingest [--recreate]
// Indexes the allowlisted project knowledge into Qdrant; only files whose content changed are embedded again.
import "dotenv/config";
import DocumentLoader from "./DocumentLoader.js";
import { chunkDocument } from "./DocumentChunker.js";
import EmbeddingService from "./EmbeddingService.js";
import QdrantStore from "./QdrantStore.js";
import { Chunk, SourceDocument } from "./RagTypes.js";

const USAGE = "Usage: yarn rag:ingest [--recreate]";

async function main(): Promise<number> {
    const args = process.argv.slice(2);
    const unknown = args.filter(arg => arg !== "--recreate");
    if (unknown.length > 0) {
        console.error(`Unknown argument: ${unknown.join(" ")}\n${USAGE}`);
        return 2;
    }
    const recreate = args.includes("--recreate");

    const store = new QdrantStore();
    await store.assertReachable();
    const embeddings = new EmbeddingService();

    const documents = new DocumentLoader().load();
    const stored = recreate ? new Map<string, string>() : await store.listFileHashes();
    const sources = new Set(documents.map(document => document.source));

    const changed: { document: SourceDocument; status: "added" | "updated" }[] = [];
    for (const document of documents) {
        const storedHash = stored.get(document.source);
        if (storedHash === document.fileHash) console.log(`unchanged  ${document.source}`);
        else changed.push({ document, status: storedHash === undefined ? "added" : "updated" });
    }
    const removed = [...stored.keys()].filter(source => !sources.has(source)).sort();

    const chunks: Chunk[] = changed.flatMap(({ document }) => chunkDocument(document));
    if (chunks.length > 0) {
        const vectors = await embeddings.embed(chunks.map(chunk => chunk.text));
        await store.ensureCollection(vectors[0].length, recreate);
        for (const { document, status } of changed) {
            if (status === "updated") await store.deleteBySource(document.source);
        }
        await store.upsert(chunks.map((chunk, index) => ({ ...chunk, vector: vectors[index] })));
        for (const { document, status } of changed) {
            const count = chunks.filter(chunk => chunk.source === document.source).length;
            console.log(`${status.padEnd(9)}  ${document.source} (${count} chunk${count === 1 ? "" : "s"})`);
        }
    }
    for (const source of removed) {
        await store.deleteBySource(source);
        console.log(`removed    ${source}`);
    }

    const count = (status: string) => changed.filter(entry => entry.status === status).length;
    console.log(
        `\nFiles: ${count("added")} added, ${count("updated")} updated, ${removed.length} removed, ` +
        `${documents.length - changed.length} unchanged — ${chunks.length} chunk(s) embedded`,
    );
    return 0;
}

main().then(
    code => process.exit(code),
    error => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    },
);
