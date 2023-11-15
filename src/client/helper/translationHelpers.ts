import { Gender, genders } from "../../shared/definitions/other/Gender";
import { TranslatedString } from "../../shared/game/TranslatedString";
import { TranslatableEntity, TranslateableEntityData } from "../../shared/translation/TranslationDataTypes";
import { arrayToCSVLine, collectTranslatableEntityData } from "../../shared/translation/translationHelpers";
import { combatStore } from "../stores/CombatStore";
import { itemStore } from "../stores/ItemStore";
import { sharedStore } from "../stores/SharedStore";
import Papa from "papaparse";
import { editorStore } from "../stores/EditorStore";
import { translationStore } from "../stores/TranslationStore";

export function clientCollectTranslatableEntityData(sourceLanguage: string) {
    if (editorStore.sessionModule) {
        const moduleActionSubtree = sharedStore.modulesRootActionTrees.find(t => t.$modelId === editorStore.sessionModule.actiontreeId);
        return collectTranslatableEntityData(
            [moduleActionSubtree],
            Array.from(sharedStore.characterConfigurations.values()).filter(characterConfiguration => characterConfiguration.moduleOwner),
            itemStore.getAllItems.filter(item => item.moduleOwner),
            [],
            [],
            [],
            null,
            sourceLanguage
        );
    } else {
        return collectTranslatableEntityData(
            [sharedStore.mainGameRootActionTree, ...sharedStore.actionTreeTemplates],
            Array.from(sharedStore.characterConfigurations.values()),
            itemStore.getAllItems,
            combatStore.config.enemyCombatPresets,
            Array.from(sharedStore.tileAssets.values()),
            Array.from(sharedStore.animationAssets.values()),
            translationStore.makeshiftTranslationSystemData,
            sourceLanguage
        );
    }
}

export function translatableEntityDataArrayToCSV(entities: TranslateableEntityData[], sourceLanguage: string, targetLanguage: string, csvSeparator: string) {
    const lines = new Array<string>();

    lines.push(`Element${csvSeparator}Text Type${csvSeparator}${genders.map(gender => `${sourceLanguage}${gender}`).join(csvSeparator)}${csvSeparator}${genders.map(gender => `${targetLanguage}${gender}`).join(csvSeparator)}${csvSeparator}Comment;ID`);

    const contentMap = new Map<string, Array<string>>();

    for (const entity of entities) {
        for (const translatableString of entity.translateableStrings) {
            const resultParts = new Array<string>();

            const translateableStringModelId = translatableString.translatedString.$modelId;
            resultParts.push(entity.label);
            resultParts.push(translatableString.label);
            for (const gender of genders) {
                resultParts.push(translatableString.translatedString.getForGender(sourceLanguage, gender, false));
            }
            for (const gender of genders) {
                resultParts.push(translatableString.translatedString.getForGender(targetLanguage, gender, false));
            }

            resultParts.push(translatableString.translatedString.comment);
            resultParts.push(translateableStringModelId);

            const contentForComparison = arrayToCSVLine(resultParts.slice(0, -1), csvSeparator);

            if (contentMap.has(contentForComparison)) {
                const duplicateResultParts = contentMap.get(contentForComparison);
                duplicateResultParts[duplicateResultParts.length - 1] += "," + translateableStringModelId;
            } else {
                contentMap.set(contentForComparison, resultParts);
            }
        }
    }

    for (const resultParts of contentMap.values()) {
        lines.push(arrayToCSVLine(resultParts, csvSeparator));
    }

    return lines.join('\r\n');
}

export enum TranslationAction {
    Discard = "Discard",
    NotSet = "NotSet",
    Commit = "Commit"
}

export const translationActions = Object.values(TranslationAction);

export interface TranslationDataForGender {
    currentSourceLanguageString: string;
    currentTargetLanguageString: string;
    importSourceLanguageString: string;
    importTargetLanguageString: string;
    sourceLanguageStringChanged: boolean;
    targetLanguageStringChanged: boolean;
    action: TranslationAction;
    sourceReplacedFromNeutral: boolean;
}

export interface TranslationStringData {
    translatedStringModelId: string;
    entityLabel: string;
    translatableStringLabel: string;
    stillExists: boolean;
    translationsByGender: Map<Gender, TranslationDataForGender>;
    translatedString: TranslatedString;
    entity: TranslatableEntity;
}

export interface TranslationData {
    filename: string;
    importCSV: string;
    sourceLanguageKey: string;
    targetLanguageKey: string;

    translations: Array<TranslationStringData>;
    translationsForRemovedElements: Array<TranslationStringData>;
}

export function populateTranslationData(filename: string, importCSV: string): TranslationData {
    const { data: lines, errors } = Papa.parse<string[]>(importCSV);
    if (errors.length > 0)
        throw new Error("Couldn't parse file:\n" + errors.map(error => `${error.row}: ${error.message}`).join("\n"));

    let nextLine = 0;

    while ((nextLine < lines.length) && lines[nextLine][0] !== "Element") {
        nextLine++;
    }

    if (nextLine === lines.length)
        throw Error("Couldn't find title line");

    const titleLine = lines[nextLine++];
    const sourceLanguageStart = 2;
    const targetLanguageStart = sourceLanguageStart + genders.length;
    const sourceLanguageKey = titleLine[sourceLanguageStart];
    const targetLanguageKey = titleLine[targetLanguageStart];
    const commentIndex = targetLanguageStart + genders.length;
    const translatableStringIdsIndex = commentIndex + 1;

    const translations = new Array<TranslationStringData>();
    const translationsForRemovedElements = new Array<TranslationStringData>();

    const currentTranslatableEntities = clientCollectTranslatableEntityData(sourceLanguageKey);
    const translatedStringsById = new Map<string, TranslatedString>();
    const entitiesByTranslatedStringId = new Map<string, TranslatableEntity>();

    for (const entity of currentTranslatableEntities) {
        for (const { translatedString } of entity.translateableStrings) {
            translatedStringsById.set(translatedString.$modelId, translatedString);
            entitiesByTranslatedStringId.set(translatedString.$modelId, entity.entity);
        }
    }

    const linesByTranslatedStringModelId = new Map<string, string[]>();

    while (nextLine < lines.length) {
        const currentLine = lines[nextLine++];
        if (currentLine.length <= 1)
            continue;

        if (currentLine.length <= translatableStringIdsIndex) {
            console.log("Cannot read line; skipping", { currentLine });
            continue;
        }

        const translatedStringModelIds = currentLine[translatableStringIdsIndex].split(",");

        for (const modelId of translatedStringModelIds) {
            linesByTranslatedStringModelId.set(modelId, currentLine);
        }
    }

    for (const [translatedStringModelId, currentLine] of linesByTranslatedStringModelId) {
        let elementIndex = 0;
        const entityLabel = currentLine[elementIndex++];
        const translatableStringLabel = currentLine[elementIndex++];

        const entity = entitiesByTranslatedStringId.get(translatedStringModelId);
        const translatedString = translatedStringsById.get(translatedStringModelId);
        const stillExists = Boolean(translatedString);

        const translationsByGender = new Map<Gender, TranslationDataForGender>();

        const importStringsSourceLanguage = new Map(genders.map(gender => [gender, currentLine[elementIndex++]]));
        const importStringsTargetLanguage = new Map(genders.map(gender => [gender, currentLine[elementIndex++]]));

        for (const gender of genders) {
            let currentSourceLanguageString = translatedString?.getForGender(sourceLanguageKey, gender, false) || "";
            const currentTargetLanguageString = translatedString?.getForGender(targetLanguageKey, gender, false) || "";
            let importSourceLanguageString = importStringsSourceLanguage.get(gender);
            const importTargetLanguageString = importStringsTargetLanguage.get(gender);

            let sourceReplacedFromNeutral = false;
            if ((gender !== Gender.Neutral) && !currentSourceLanguageString && !importSourceLanguageString) {
                const translationDataForNeutral = translationsByGender.get(Gender.Neutral);
                currentSourceLanguageString = translationDataForNeutral.currentSourceLanguageString;
                importSourceLanguageString = translationDataForNeutral.importSourceLanguageString;
                sourceReplacedFromNeutral = true;
            }

            const sourceLanguageStringChanged = currentSourceLanguageString !== importSourceLanguageString;
            const targetLanguageStringChanged = currentTargetLanguageString !== importTargetLanguageString;
            const targetLanguageConflict = targetLanguageStringChanged && Boolean(currentTargetLanguageString);

            let action: TranslationAction;
            if (!targetLanguageStringChanged) {
                action = TranslationAction.Discard;
            } else if (sourceLanguageStringChanged || targetLanguageConflict) {
                action = TranslationAction.NotSet;
            } else {
                action = TranslationAction.Commit;
            }

            translationsByGender.set(gender, {
                currentSourceLanguageString,
                currentTargetLanguageString,
                importSourceLanguageString,
                importTargetLanguageString,
                sourceLanguageStringChanged,
                targetLanguageStringChanged,
                action,
                sourceReplacedFromNeutral
            });
        }

        const translation = {
            translatedStringModelId,
            entityLabel,
            translatableStringLabel,
            stillExists,
            translationsByGender,
            translatedString,
            entity
        };

        if (stillExists) {
            translations.push(translation);
        } else {
            translationsForRemovedElements.push(translation);
        }
    }

    return {
        filename,
        importCSV,
        sourceLanguageKey,
        targetLanguageKey,
        translations,
        translationsForRemovedElements
    };
}