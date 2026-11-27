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
     * Return the file of the nearest class in the inheritance chain (runtime class first,
     * following `extends <Name>`, stopping before Component) whose string property
     * initializer declares the selector; falls back to the runtime class's file.
     */
    public static async findDeclaring(componentName: string, selectorStr: string): Promise<string> {
        const runtimeFile = this.find(componentName);
        const ts = (await import("typescript")).default;

        const visited = new Set<string>();
        let name: string | undefined = componentName;

        while (name && name !== "Component" && !visited.has(name)) {
            visited.add(name);

            let file: string;
            try {
                file = this.find(name);
            } catch {
                break;
            }

            const sourceFile = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
            const classDeclaration = sourceFile.statements.find(
                (statement): statement is import("typescript").ClassDeclaration =>
                    ts.isClassDeclaration(statement) && statement.name?.text === name
            );
            if (!classDeclaration) {
                break;
            }

            const declares = classDeclaration.members.some(member =>
                ts.isPropertyDeclaration(member) &&
                !!member.initializer &&
                (ts.isStringLiteral(member.initializer) || ts.isNoSubstitutionTemplateLiteral(member.initializer)) &&
                this.matchesSelector(member.initializer.text, selectorStr)
            );
            if (declares) {
                return file;
            }

            const extendsClause = classDeclaration.heritageClauses?.find(
                clause => clause.token === ts.SyntaxKind.ExtendsKeyword
            );
            const parent = extendsClause?.types[0]?.expression;
            name = parent && ts.isIdentifier(parent) ? parent.text : undefined;
        }

        return runtimeFile;
    }

    /**
     * Equality, or a dynamic<Name> template whose tokens match any text.
     */
    private static matchesSelector(value: string, selectorStr: string): boolean {
        if (value === selectorStr) {
            return true;
        }
        const placeholderPattern = /\bdynamic[A-Z][A-Za-z0-9]*\b/g;
        if (!placeholderPattern.test(value)) {
            return false;
        }
        const pattern = value
            .split(placeholderPattern)
            .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("[\\s\\S]*");
        return new RegExp(`^${pattern}$`).test(selectorStr);
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