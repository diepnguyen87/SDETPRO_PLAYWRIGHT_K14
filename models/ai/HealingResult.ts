export type HealingStatus = "HEALED" | "MANUAL" | "FAILED" | "SKIPPED";

export interface HealingResult {
    status:                HealingStatus;
    rootCause?:            string;
    patchType?:            string;
    rootCauseConfidence?:  number;
    patchConfidence?:      number;
    originalLocator?:      string;
    healedLocator?:        string;
    sourceFile?:           string;
    reason?:               string;
    retryCount:            number;
}
