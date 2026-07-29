import { TestInfo } from "@playwright/test";
import winston from "winston";

export default class LoggerManager {

    public static getLogger(testInfo: TestInfo) {

        const browser = testInfo.project.name;
        const testName = testInfo.title.split("|").pop()!.trim().replace(/\s+/g, "_");
        return this.createLogger(browser, testName);
    }

    private static createLogger(browser: string, testName: string) {
        return winston.createLogger({
            transports: [
                new winston.transports.File({
                    filename: `logs/${browser}.${testName}.log`
                })
            ]
        });
    }
}