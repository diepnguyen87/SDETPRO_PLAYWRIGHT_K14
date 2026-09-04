import { exec } from "child_process";

export default class TestRerunner {

    public static run(command: string): Promise<void> {

        return new Promise((resolve, reject) => {
            console.log(`Rerunning test: ${command}`);
            const process = exec(command);
            process.stdout?.pipe(process.stdout);
            process.stderr?.pipe(process.stderr);
            process.on("close", code => {

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