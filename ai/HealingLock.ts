import fs from "fs";

const STALE_LOCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export default class HealingLock {

    private static lockPath(sourceFile: string): string {
        return `${sourceFile}.healing.lock`;
    }

    /**
     * Attempt to acquire an exclusive lock for the given source file.
     * Returns true if the lock was obtained, false if another worker holds it.
     * Stale locks (older than 5 minutes) are automatically removed.
     */
    public static acquire(sourceFile: string): boolean {
        const lockFile = this.lockPath(sourceFile);

        // Remove stale lock if present
        if (fs.existsSync(lockFile)) {
            try {
                const stat = fs.statSync(lockFile);
                const ageMs = Date.now() - stat.mtimeMs;
                if (ageMs > STALE_LOCK_THRESHOLD_MS) {
                    console.log(
                        `[HealingLock] Stale lock detected (${Math.round(ageMs / 1000)}s old). Removing: ${lockFile}`
                    );
                    fs.unlinkSync(lockFile);
                }
            } catch {
                // If stat or unlink fails, fall through to the atomic create attempt
            }
        }

        try {
            // 'wx' = exclusive create — fails atomically with EEXIST if file already exists
            const fd = fs.openSync(lockFile, "wx");
            fs.closeSync(fd);
            return true;
        } catch (e: any) {
            if (e.code === "EEXIST") {
                return false;
            }
            throw e;
        }
    }

    /**
     * Release the lock for the given source file.
     * Safe to call even if the lock no longer exists.
     */
    public static release(sourceFile: string): void {
        const lockFile = this.lockPath(sourceFile);
        try {
            fs.unlinkSync(lockFile);
        } catch {
            // Already removed or never created — ignore
        }
    }
}
