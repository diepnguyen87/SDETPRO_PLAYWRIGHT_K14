import { exec } from "child_process";

export default class TestRerunner {

    public static run(command: string): Promise<void> {

        return new Promise((resolve, reject) => {
            console.log(`Rerunning test: ${command}`);

            // Pass HEALING_RERUN=true so the child process skips self-healing,
            // preventing recursive healing loops.
            const child = exec(command, {
                env: { ...process.env, HEALING_RERUN: "true" }
            });

            // Pipe child output to the parent process console
            child.stdout?.pipe(process.stdout);
            child.stderr?.pipe(process.stderr);

            child.on("close", code => {
                if (code === 0) {
                    console.log("Rerun passed.");
                    resolve();
                } else {
                    reject(
                        new Error(`Rerun failed with exit code ${code}`)
                    );
                }
            });
        });
    }
}
