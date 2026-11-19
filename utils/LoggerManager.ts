import { TestInfo } from "@playwright/test";
import winston from "winston";

export default class LoggerManager {

    public static getLogger(testInfo: TestInfo) {
        return this.createLogger(this.logFilePath(testInfo.project.name, testInfo.title));
    }

    // logs/{browser}.{part of the title after the last "|", spaces → _}.log — also used by the summary reporter
    public static logFilePath(browser: string, title: string): string {
        const testName = title.split("|").pop()!.trim().replace(/\s+/g, "_");
        return `logs/${browser}.${testName}.log`;
    }

    private static createLogger(filename: string) {
        return winston.createLogger({
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            transports: [
                new winston.transports.File({
                    filename
                })
            ]
        });
    }
}