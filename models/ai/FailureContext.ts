export type FailureSource = "ACTION" | "ASSERTION";

export interface FailureContext {
    failureSource:  FailureSource;
    testName:       string;
    testFile:       string;
    browser:        string;
    error:          string;
    stackTrace:     string;
    url:            string;
    failedLocator:  string;
    sourceFile:     string;
    artifactFolder: string;
    timestamp:      string;
}
