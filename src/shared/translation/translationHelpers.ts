import { ActionTreeModel } from "../action/ActionTreeModel";
import { EnemyCombatPresetModel } from "../combat/EnemyCombatPresetModel";
import { Gender } from "../definitions/other/Gender";
import { ItemModel } from "../game/ItemModel";
import { isBlank, replaceAll } from "../helper/generalHelpers";
import { AnimationAssetModel } from "../resources/AnimationAssetModel";
import { CharacterConfigurationModel } from "../resources/CharacterConfigurationModel";
import { TileAssetModel } from "../resources/TileAssetModel";
import { MakeshiftTranslationSystemDataModel } from "./MakeshiftTranslationSystemDataModel";
import { TranslateableEntityData } from "./TranslationDataTypes";

// https://stackoverflow.com/a/68146412
export function arrayToCSVLine(rowData: string[], csvSeparator: string) {
    return rowData
        .map(v => replaceAll(v, '"', '""'))  // escape double colons
        .map(v => `"${v}"`)  // quote it
        .join(csvSeparator);
}

export function collectTranslatableEntityData(
    actionTrees: ActionTreeModel[],
    characters: CharacterConfigurationModel[],
    items: ItemModel[],
    enemyCombatPresets: EnemyCombatPresetModel[],
    tileAssets: TileAssetModel[],
    animationAssets: AnimationAssetModel[],
    makeshiftTranslationSystemData: MakeshiftTranslationSystemDataModel,
    languageKeyForEmptyCheck: string
): Array<TranslateableEntityData> {
    let result = new Array<TranslateableEntityData>();

    if (actionTrees) {
        for (const actionTree of actionTrees) {
            addActionTree(actionTree, result);
        }
    }

    characters.forEach(character => result.push(character.translatableEntityData()));
    items.forEach(item => result.push(item.translatableEntityData()));
    enemyCombatPresets.forEach(enemyCombatPreset => result.push(enemyCombatPreset.translatableEntityData()));
    tileAssets.forEach(tileAsset => result.push(tileAsset.translatableEntityData()));
    animationAssets.forEach(animationAsset => result.push(animationAsset.translatableEntityData()));
    makeshiftTranslationSystemData?.translatableEntityDataArray().forEach(translateableEntityData => result.push(translateableEntityData));

    result.forEach(entityData => removeEmptyTranslatableStrings(entityData, languageKeyForEmptyCheck));
    result = result.filter(isNotEmptyTranslatableEntity);
    return result;
}

function addActionTree(root: ActionTreeModel, result: Array<TranslateableEntityData>) {
    if (root.treePropertiesAction?.excludeFromTranslations)
        return;

    for (const action of root.nonSubTreeActions) {
        result.push(action.translatableEntityData());
    }

    for (const subTree of root.subtreeActions) {
        addActionTree(subTree, result);
    }
}

function removeEmptyTranslatableStrings(entityData: TranslateableEntityData, languageKeyForEmptyCheck: string) {
    if (!entityData)
        return;

    entityData.translateableStrings = entityData.translateableStrings.filter(
        translateableString =>
            !isBlank(translateableString.translatedString.getForGender(languageKeyForEmptyCheck, Gender.Neutral, false)) ||
            !isBlank(translateableString.translatedString.getForGender(languageKeyForEmptyCheck, Gender.Female, false)) ||
            !isBlank(translateableString.translatedString.getForGender(languageKeyForEmptyCheck, Gender.Male, false))
    );
}

function isNotEmptyTranslatableEntity(translatableText: TranslateableEntityData) {
    return translatableText && translatableText.translateableStrings.length > 0;
}