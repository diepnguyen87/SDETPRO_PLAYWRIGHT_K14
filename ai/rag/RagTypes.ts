export type ChunkType =
    | "requirement"
    | "business-rule"
    | "defect"
    | "knowledge"
    | "spec"
    | "page"
    | "component"
    | "flow"
    | "page-registry";

export const CHUNK_TYPES: readonly ChunkType[] = [
    "requirement", "business-rule", "defect", "knowledge", "spec", "page", "component", "flow", "page-registry",
];

export type SourceDocument = {
    // Repo-relative path with forward slashes
    source: string;
    type: ChunkType;
    content: string;
    fileHash: string;
};

export type Chunk = {
    source: string;
    type: ChunkType;
    area?: string;
    title: string;
    startLine: number;
    endLine: number;
    text: string;
    fileHash: string;
    chunkIndex: number;
};

export type EmbeddedChunk = Chunk & { vector: number[] };

export type ScoredChunk = Chunk & { score: number };

export type ChunkFilter = { type?: ChunkType };
