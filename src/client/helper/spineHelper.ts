import { Skeleton, Skin } from "@pixi-spine/all-4.1";
import { CharacterConfigurationModel } from "../../shared/resources/CharacterConfigurationModel";

/**
 * Returns all skin class names of the assigned {@link Skeleton}.
 * @param skins The skins to get the skin class names from.
 * @param filterIcons If true filters out the skin class name "Icons".
 */
export function getAllSkinClassNames(skins: Skin[], filterIcons = true): string[] {
    let names = skins.map(skin => skin.name.includes("/") ? skin.name.substring(0, skin.name.lastIndexOf('/')) : "");

    if (filterIcons) {
        names = names.filter(name => name != "Icons"); // special case: Icons can be stored as a skin class but should not be selectable
    }

    return applyDefaultSkinNameFilter(names);
}

export function getAllCharacterSkinVariantNames(skins: Skin[], skinClass: string, filterDirectionPrefix = true) {
    const skinNames = skins
        .filter(skin => skin.name)
        .map(skin => skin.name);

    return filterForVariantNames(skinNames, skinClass, filterDirectionPrefix);
}

/**
 * Filters an array of skin paths to variant names of the assigned skin class.
 *
 * @param skinPaths Paths to filter for variant names.
 * @param skinClass The class to filter for.
 * @param removeDirectionPrefix Removes variant names direction prefixes if true.
 */
export function filterForVariantNames(skinPaths: Array<string>, skinClass: string, removeDirectionPrefix = true) {
    skinPaths = skinPaths.filter(skinName => skinName.startsWith(skinClass + "/"))
        .map(skinName => skinName.substring(skinName.lastIndexOf('/') + 1, skinName.length))// remove suffix
        .sort((nameA, nameB) => nameA.localeCompare(nameB));
    if (removeDirectionPrefix) {
        skinPaths = skinPaths.map(variantName => {
            if (variantName.startsWith(CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix1)) return variantName.replace(CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix1, "");
            if (variantName.startsWith(CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix2)) return variantName.replace(CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix2, "");
            return variantName;
        });
    }
    return skinPaths.filter((n, index, self) => index === self?.indexOf(n)); // make entries unique
}

export function filterOnlyWithoutDirectionPrefix(skinVariantNames: Array<string>) {
    return skinVariantNames.filter(variantName => !variantName.startsWith(CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix1)
        && !variantName.startsWith(CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix2));
}

function applyDefaultSkinNameFilter(names: string[]) {
    return names?.filter(n => n != "")
        .filter((n, index, self) => index === self.indexOf(n)) // make unique
        .sort((nameA, nameB) => nameA.localeCompare(nameB));
}
