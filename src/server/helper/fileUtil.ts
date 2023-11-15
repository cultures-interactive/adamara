import fse from "fs-extra";
import { logger } from "../integrations/logging";
import path, { ParsedPath } from "path";

export async function loadFileList(directoryPath: string, extensions: string[]): Promise<ParsedPath[]> {
    if (!directoryPath || !await fse.pathExists(directoryPath)) {
        logger.warn(`Couldn't find files in path: ${directoryPath}`);
        return [];
    }
    const fileList = [];
    for (const file of await fse.readdir(directoryPath)) {
        const parsedFile = path.parse(file);
        if (isValidFile(parsedFile, extensions)) {
            parsedFile.dir = directoryPath;
            fileList.push(parsedFile);
        }
    }
    return fileList;
}

function isValidFile(parsedFile: ParsedPath, extensions: string[]): boolean {
    return (parsedFile && parsedFile.ext?.length && extensions.includes(parsedFile.ext.substr(1)));  // extension without "."
}