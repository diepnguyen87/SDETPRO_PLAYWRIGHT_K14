import * as fs from 'fs';

export function readJsonFile<T>(jsonDataFile: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.readFile(jsonDataFile, 'utf8', (err: NodeJS.ErrnoException | null, data: string) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        });
    });
}

type ClassNameType<T> = new () => T;
export async function parseJsonStringToObject<T>(jsonString: string, className: ClassNameType<T>): Promise<T[]> {
    let object: T[];

    try {
        object = JSON.parse(jsonString);
    } catch (error) {
        throw new Error('[ERROR] Json string syntax')
    }
    return object;
}