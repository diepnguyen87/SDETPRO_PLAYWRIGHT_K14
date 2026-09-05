export interface AIAnalysis {
    reason: string;
    confidence: number;
    field: string;
    oldLocator: string;
    newLocator: string;
    strategy: string;
    explanation: string;
}