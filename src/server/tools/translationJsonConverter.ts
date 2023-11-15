import fse from "fs-extra";
import Papa from "papaparse";
import { arrayToCSVLine } from "../../shared/translation/translationHelpers";

const divider = "|";
const csvSeperator = ";";

export async function translationJsonToCsv(sourceLanguageKey: string, sourceLanguageName: string, translationTitle: string) {
    const sourceFilename = `assets/locales/${sourceLanguageKey}.json`;
    const targetFilename = `temp/locale_${sourceLanguageKey}.csv`;

    const contentBuffer = await fse.readFile(sourceFilename);
    const contentJson = contentBuffer.toString();
    const content = JSON.parse(contentJson);

    const lines = [arrayToCSVLine(["Key", sourceLanguageName, translationTitle], csvSeperator)];

    for (const category of Object.keys(content)) {
        if (category.includes(divider))
            throw new Error(`Category key '${category}' uses divider character '${divider}'`);

        const categoryContent = content[category];
        for (const key of Object.keys(categoryContent)) {
            if (category.includes(divider))
                throw new Error(`Line key '${key}' uses divider character '${divider}'`);

            const fullKey = category + divider + key;
            const value = categoryContent[key];

            lines.push(arrayToCSVLine([fullKey, value, ""], csvSeperator));
        }
    }

    const csvContent = lines.join("\r\n");
    await fse.writeFile(targetFilename, csvContent);
}

export async function translationCsvToJson(sourceFilename: string) {
    const targetFilename = sourceFilename.replace(".csv", ".json");

    const contentBuffer = await fse.readFile(sourceFilename);
    const contentCsv = contentBuffer.toString();

    const { data: lines, errors } = Papa.parse<string[]>(contentCsv);
    if (errors.length > 0)
        throw new Error("Couldn't parse file:\n" + errors.map(error => `${error.row}: ${error.message}`).join("\n"));

    let nextLine = 0;

    while ((nextLine < lines.length) && lines[nextLine][0] !== "Key") {
        nextLine++;
    }

    if (nextLine === lines.length)
        throw Error("Couldn't find title line");

    nextLine++;

    const jsonObject: Record<string, Record<string, string>> = {};

    while (nextLine < lines.length) {
        const currentLine = lines[nextLine++];
        if (currentLine.length <= 1)
            continue;

        const fullKey = currentLine[0];
        const value = currentLine[2];
        const [category, key] = fullKey.split(divider);

        if (!(category in jsonObject)) {
            jsonObject[category] = {};
        }

        jsonObject[category][key] = value;
    }

    const jsonContent = JSON.stringify(jsonObject, null, "    ");
    await fse.writeFile(targetFilename, jsonContent);
}