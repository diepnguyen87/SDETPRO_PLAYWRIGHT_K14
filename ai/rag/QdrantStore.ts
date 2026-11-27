import { QdrantClient } from "@qdrant/js-client-rest";
import { createHash } from "node:crypto";
import { Chunk, ChunkFilter, EmbeddedChunk, ScoredChunk } from "./RagTypes.js";
import { VectorStore } from "./VectorStore.js";

const DEFAULT_URL = "http://localhost:6333";
const COLLECTION = "knowledge";
const UPSERT_BATCH_SIZE = 64;

export default class QdrantStore implements VectorStore {

    private readonly url: string;
    private readonly client: QdrantClient;

    constructor() {
        this.url = process.env.QDRANT_URL || DEFAULT_URL;
        this.client = new QdrantClient({ url: this.url, checkCompatibility: false });
    }

    public async assertReachable(): Promise<void> {
        try {
            await this.client.getCollections();
        } catch {
            throw new Error(`Qdrant is not running at ${this.url}; start it with \`docker compose --profile rag up -d qdrant\``);
        }
    }

    public async ensureCollection(vectorSize: number, recreate: boolean): Promise<void> {
        const { exists } = await this.client.collectionExists(COLLECTION);
        if (exists && recreate) await this.client.deleteCollection(COLLECTION);
        if (exists && !recreate) {
            const info = await this.client.getCollection(COLLECTION);
            const vectors = info.config.params.vectors;
            const storedSize = vectors && "size" in vectors ? vectors.size : undefined;
            if (storedSize !== vectorSize) {
                throw new Error(`Collection "${COLLECTION}" holds vectors of size ${storedSize}, the embedding model returns ${vectorSize}; run \`yarn rag:ingest --recreate\``);
            }
            return;
        }
        await this.client.createCollection(COLLECTION, { vectors: { size: vectorSize, distance: "Cosine" } });
        for (const field_name of ["source", "type"]) {
            await this.client.createPayloadIndex(COLLECTION, { field_name, field_schema: "keyword", wait: true });
        }
    }

    public async listFileHashes(): Promise<Map<string, string>> {
        const hashes = new Map<string, string>();
        if (!(await this.client.collectionExists(COLLECTION)).exists) return hashes;
        let offset: string | number | undefined;
        do {
            const page = await this.client.scroll(COLLECTION, { limit: 256, offset, with_payload: ["source", "fileHash"], with_vector: false });
            for (const point of page.points) {
                const payload = point.payload as { source: string; fileHash: string };
                hashes.set(payload.source, payload.fileHash);
            }
            const next = page.next_page_offset;
            offset = typeof next === "string" || typeof next === "number" ? next : undefined;
        } while (offset !== undefined);
        return hashes;
    }

    public async deleteBySource(source: string): Promise<void> {
        await this.client.delete(COLLECTION, { wait: true, filter: { must: [{ key: "source", match: { value: source } }] } });
    }

    public async upsert(chunks: EmbeddedChunk[]): Promise<void> {
        for (let start = 0; start < chunks.length; start += UPSERT_BATCH_SIZE) {
            const points = chunks.slice(start, start + UPSERT_BATCH_SIZE).map(({ vector, ...chunk }) => ({
                id: pointId(chunk.source, chunk.chunkIndex),
                vector,
                payload: chunk,
            }));
            await this.client.upsert(COLLECTION, { wait: true, points });
        }
    }

    public async search(vector: number[], topK: number, filter?: ChunkFilter): Promise<ScoredChunk[]> {
        const result = await this.client.query(COLLECTION, {
            query: vector,
            limit: topK,
            with_payload: true,
            ...(filter?.type ? { filter: { must: [{ key: "type", match: { value: filter.type } }] } } : {}),
        });
        return result.points.map(point => ({ ...(point.payload as unknown as Chunk), score: point.score }));
    }
}

// Deterministic UUID, so re-ingesting a file overwrites its points instead of duplicating them
function pointId(source: string, chunkIndex: number): string {
    const hex = createHash("sha256").update(`${source}#${chunkIndex}`).digest("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
