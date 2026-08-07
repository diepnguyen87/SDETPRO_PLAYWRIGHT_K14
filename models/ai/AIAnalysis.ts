export interface AIAnalysis {
    reason: string;
    confidence: number;
    oldLocator: string;
    newLocator: string;
    strategy: string;
    explanation: string;
}