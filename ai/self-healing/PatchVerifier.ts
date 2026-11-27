import fs from "fs";

export default class PatchVerifier {

    public static verify(sourceFile: string, oldValue: string, newValue: string): void {

        const source = fs.readFileSync(
            sourceFile,
            "utf8"
        );

        // Old locator must no longer exist
        if (source.includes(oldValue)) {
            throw new Error(`Patch verification failed: old locator still exists: ${oldValue}`);
        }

        // New locator must exist
        if (!source.includes(newValue)) {
            throw new Error(`Patch verification failed: new locator not found: ${newValue}`);
        }
        console.log("Patch verified successfully.");
    }
}