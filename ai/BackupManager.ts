import fs from "fs";

export default class BackupManager {

    public static create(sourceFile: string): string {

        const backupFile = `${sourceFile}.bak`;
        fs.copyFileSync(sourceFile, backupFile);
        console.log(`Backup created: ${backupFile}`);
        return backupFile;
    }

    public static restore(sourceFile: string): void {

        const backupFile = `${sourceFile}.bak`;
        if (!fs.existsSync(backupFile)) {
            throw new Error(`Backup file not found: ${backupFile}`);
        }
        fs.copyFileSync(backupFile, sourceFile);
        console.log(`Source restored from backup`);
    }
}