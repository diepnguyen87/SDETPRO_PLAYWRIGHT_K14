export interface Metadata {
    testName: string;
    testFile: string;
    browser: string;
    error?: string;
    stackTrace: string;
    url: string;
    failedLocator: string;
    timestamp: string;
}