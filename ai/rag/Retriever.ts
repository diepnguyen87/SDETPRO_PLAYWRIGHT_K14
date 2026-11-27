import EmbeddingService from "./EmbeddingService.js";
import { ChunkType, ScoredChunk } from "./RagTypes.js";
import { VectorStore } from "./VectorStore.js";

export default class Retriever {

    constructor(private readonly store: VectorStore, private readonly embeddings: EmbeddingService = new EmbeddingService()) {}

    public async retrieve(query: string, options: { topK: number; type?: ChunkType }): Promise<ScoredChunk[]> {
        const [vector] = await this.embeddings.embed([query]);
        return this.store.search(vector, options.topK, options.type ? { type: options.type } : undefined);
    }
}
