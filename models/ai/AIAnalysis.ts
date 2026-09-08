export enum RootCauseType {
    LOCATOR_BROKEN = 'LOCATOR_BROKEN',
    TIMING         = 'TIMING',
    ASSERTION      = 'ASSERTION',
    LOGIC          = 'LOGIC',
}

export enum PatchType {
    LOCATOR = 'LOCATOR',
    MANUAL  = 'MANUAL',
}

export interface FailureAnalysis {
    rootCause:              RootCauseType;
    patchType:              PatchType;
    reason:                 string;
    rootCauseConfidence:    number;
    patchConfidence:        number;
    field:                  string;
    oldValue:               string;
    newValue:               string;
    strategy:               string;
    explanation:            string;
}
