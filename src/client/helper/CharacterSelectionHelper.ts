import { CharacterConfigurationModel } from "../../shared/resources/CharacterConfigurationModel";
import { MdFace } from "react-icons/md";
import { FaTshirt, FaWheelchair } from "react-icons/fa";
import { GiBlackBelt, GiConverseShoe, GiSnorkel, GiTrousers } from "react-icons/gi";
import React from "react";
import { Skin, Spine } from "@pixi-spine/all-4.1";
import { getAllCharacterSkinVariantNames, getAllSkinClassNames } from "./spineHelper";
import { Arrays } from "../../shared/helper/Arrays";
import { runInAction } from "mobx";

export enum SelectionConstrain {
    Any, // default
    ExactlyOne,
    MinimumOne,
    MaximumOne = 3
}

const skinAccessoires = "Accessoires";

export class CharacterSelectionHelper {
    public static readonly ClassNameToIcon: Map<string, JSX.Element> = new Map<string, JSX.Element>([
        ["Köpfe", React.createElement(MdFace)],
        ["Koepfe", React.createElement(MdFace)],
        ["Oberbekleidung", React.createElement(FaTshirt)],
        ["Unterbekleidung", React.createElement(GiTrousers)],
        ["Schuhe", React.createElement(GiConverseShoe)],
        ["Taucherausrüstung", React.createElement(GiSnorkel)],
        [skinAccessoires, React.createElement(GiBlackBelt)],
        ["Rollstühle", React.createElement(FaWheelchair)]
    ]);

    private static readonly ClassNameToConstrain: Map<string, SelectionConstrain> = new Map([
        ["Köpfe", SelectionConstrain.ExactlyOne],
        ["Koepfe", SelectionConstrain.ExactlyOne],
        ["Unterbekleidung", SelectionConstrain.MinimumOne],
        ["Oberbekleidung", SelectionConstrain.MinimumOne],
        ["Schuhe", SelectionConstrain.MaximumOne],
        ["Rollstühle", SelectionConstrain.ExactlyOne]
    ]);

    /**
     * Toggled the assigned variant of the assigned class and considered the selections constraints of the class.
     * @param char The character to toggle on.
     * @param variantsOfAnimation All available variantNames of the animation and class.
     * @param skinClassName The class name of the variant.
     * @param skinVariantName The variant name to toggle.
     */
    public static constrainedToggle(char: CharacterConfigurationModel, variantsOfAnimation: Array<string>, skinClassName: string, skinVariantName: string) {
        const skinIsSelected = char.isSkinActive(skinClassName, skinVariantName);
        const classConstrain = CharacterSelectionHelper.ClassNameToConstrain.get(skinClassName);
        const activeCount = variantsOfAnimation.filter(variantName => char.isSkinActive(skinClassName, variantName)).length;
        if (classConstrain === SelectionConstrain.ExactlyOne) {
            if (skinIsSelected && activeCount == 1) return;
            char.removeAllSkins(skinClassName);
        }
        if (classConstrain === SelectionConstrain.MinimumOne && (skinIsSelected && activeCount == 1)) return;
        if (classConstrain === SelectionConstrain.MaximumOne) {
            if (!skinIsSelected && activeCount == 1) {
                char.removeAllSkins(skinClassName);
            }
        }

        char.toggleSkins(skinClassName, skinVariantName);
    }

    public static randomizeSkinSelection(skins: Skin[], character: CharacterConfigurationModel) {
        runInAction(() => {
            character.resetSkins(true);
            const skinClassNames = getAllSkinClassNames(skins);
            skinClassNames?.forEach(skinClassName => {
                const classConstrain = CharacterSelectionHelper.ClassNameToConstrain.get(skinClassName);
                if (classConstrain) { // only apply skins with constraints
                    const skinVariantNames = getAllCharacterSkinVariantNames(skins, skinClassName, true);
                    const randomVariant = Arrays.randomItem(skinVariantNames);
                    character.toggleSkins(skinClassName, randomVariant);
                }
            });

            this.selectRandomAccessoires(skins, character, 0, 4);
        });
    }

    private static selectRandomAccessoires(skins: Skin[], character: CharacterConfigurationModel, minCount: number, maxCount: number) {
        const skinVariantNames = getAllCharacterSkinVariantNames(skins, skinAccessoires, true);
        const count = Math.min(skinVariantNames.length, minCount + Math.floor(Math.random() * (maxCount - minCount)));
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * skinVariantNames.length);
            const skin = skinVariantNames[randomIndex];
            character.toggleSkins(skinAccessoires, skin);
            skinVariantNames.splice(randomIndex, 1);
        }
    }
}
