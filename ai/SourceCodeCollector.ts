import fs from "fs";
import path from "path";

export default class SourceCodeCollector {

    /**
     * Cache:
     * ConfirmOrderComponent -> /Users/.../models/components/ConfirmOrderComponent.ts
     */
    private static readonly componentCache = new Map<string, string>();

    /**
     * Root source folder
     */
    private static readonly sourceRoot = path.resolve(process.cwd(), "models");

    /**
     * Read source code of a component by class name.
     */
    public static read(componentName: string): string {
        const file = this.find(componentName);
        return fs.readFileSync(file, "utf8");
    }

    /**
     * Return absolute file path.
     */
    public static find(componentName: string): string {
        const cached = this.componentCache.get(componentName);

        if (cached) {
            return cached;
        }

        const file = this.scan(
            this.sourceRoot,
            `${componentName}.ts`
        );

        if (!file) {
            throw new Error(
                `Cannot find source file for component: ${componentName}`
            );
        }
        this.componentCache.set(componentName, file);
        return file;
    }

    /**
     * Recursive directory scan.
     */
    private static scan(
        directory: string,
        targetFile: string
    ): string | null {
        const files = fs.readdirSync(
            directory,
            {
                withFileTypes: true
            }
        );

        for (const file of files) {
            const fullPath = path.join(
                directory,
                file.name
            );

            if (file.isDirectory()) {
                const result = this.scan(
                    fullPath,
                    targetFile
                );
                if (result) {
                    return result;
                }
            } else if (
                file.isFile() &&
                file.name === targetFile
            ) {
                return fullPath;
            }
        }
        return null;
    }
}