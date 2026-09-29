import { FailureAnalysis, PatchType, RootCauseType } from "../../models/ai/AIAnalysis.js";

/**
 * Output shape shown to the AI, derived from FailureAnalysis.
 * Interfaces are erased at runtime, so the shape is typed against the interface:
 * adding, removing or retyping a field in FailureAnalysis fails compilation here.
 * Enum values are read from the runtime enums.
 */
/** One sample value per FailureAnalysis field: number fields → number, others → string. */
type SchemaShape = {
    [K in keyof FailureAnalysis]: FailureAnalysis[K] extends number ? number : string
};

const FAILURE_ANALYSIS_SHAPE: SchemaShape = {
    rootCause:           Object.values(RootCauseType).join(" | "),
    patchType:           Object.values(PatchType).join(" | "),
    reason:              "...",
    rootCauseConfidence: 0,
    patchConfidence:     0,
    field:               "...",
    oldValue:            "...",
    newValue:            "...",
    strategy:            "...",
    explanation:         "..."
};

export const FAILURE_ANALYSIS_SCHEMA = `
${JSON.stringify(FAILURE_ANALYSIS_SHAPE, null, 2)}
`;
