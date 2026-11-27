import { ChunkFilter, EmbeddedChunk, ScoredChunk } from "./RagTypes.js";

export interface VectorStore {
    // Creates the collection when missing; recreate drops it first. Throws when the stored vector size differs
    ensureCollection(vectorSize: number, recreate: boolean): Promise<void>;
    // source → fileHash of the chunks already stored (empty when the collection does not exist)
    listFileHashes(): Promise<Map<string, string>>;
    deleteBySource(source: string): Promise<void>;
    upsert(chunks: EmbeddedChunk[]): Promise<void>;
    search(vector: number[], topK: number, filter?: ChunkFilter): Promise<ScoredChunk[]>;
}
