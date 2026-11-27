import { client } from "../shared/aiClient.js";

const BATCH_SIZE = 100;

export default class EmbeddingService {

    private readonly model: string;

    constructor() {
        const model = process.env.OPEN_EMBEDDING_MODEL;
        if (!model) throw new Error("OPEN_EMBEDDING_MODEL is missing from .env");
        this.model = model;
    }

    public async embed(texts: string[]): Promise<number[][]> {
        const vectors: number[][] = [];
        for (let start = 0; start < texts.length; start += BATCH_SIZE) {
            const response = await client.embeddings.create({ model: this.model, input: texts.slice(start, start + BATCH_SIZE) });
            vectors.push(...response.data.sort((a, b) => a.index - b.index).map(item => item.embedding));
        }
        return vectors;
    }
}
