import { findChildren, fromSnapshot, getParent } from "mobx-keystone";
import { NPCReferenceModel } from "../../shared/action/NPCReferenceModel";
import { AnimationPropertiesValueModel } from "../../shared/action/ValueModel";
import { DynamicMapElementAnimationElementModel } from "../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel";
import { DynamicMapElementNPCModel } from "../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { MapDataModel } from "../../shared/game/MapDataModel";
import { AnimationAssetModel, AnimationType } from "../../shared/resources/AnimationAssetModel";
import { CharacterConfigurationModel } from "../../shared/resources/CharacterConfigurationModel";
import { ActionTree } from "../database/models/ActionTree";
import { AnimationAsset } from "../database/models/AnimationAsset";
import { CharacterConfiguration } from "../database/models/CharacterConfiguration";
import { GameMap } from "../database/models/GameMap";
import { logger } from "../integrations/logging";
import { TranslatedString } from "../../shared/game/TranslatedString";
import { ActionTreeModel, ActionTreeType, TreeAccess } from "../../shared/action/ActionTreeModel";
import { Op } from "sequelize";
import { ActionModel } from "../../shared/action/ActionModel";
import { isActionTreeParameter } from "../../shared/helper/actionTreeHelper";

const ignoredMaps = new Set([
    "csongor_test",
    "Tobias' Sandbox",
    "Kevin Action Editor Play Around",
    "Balthazar Testmap",
    "Test1",
    "Fritz Thiel_Testing Hall"
]);

const ignoredActionTreePaths = [
    "MainGameRoot > Balthazar Test",
    "MainGameRoot > Dev Testing",
    "MainGameRoot > KevinTest",
    "MainGameRoot > Csongors Sandbox",
    "MainGameRoot > Tobias' Sandbox"
];

function startsWithIgnoredActionTreePath(path: string) {
    for (const ignoredPath of ignoredActionTreePaths) {
        if (path.startsWith(ignoredPath))
            return true;
    }

    return false;
}

function getNonIgnoredMapCount(maps: IterableIterator<MapDataModel>) {
    let count = 0;
    for (const map of maps) {
        if (!ignoredMaps.has(map.properties.name)) {
            count++;
        }
    }
    return count;
}

function getActionTreePath(element: any): string {
    let name: string;
    let parentElement: any;

    if (element instanceof ActionTreeModel) {
        const propertiesName = element.treePropertiesAction?.localizedName.get("de");

        switch (element.type) {
            case ActionTreeType.MainGameRoot:
            case ActionTreeType.ModuleRoot:
                name = ActionTreeType[element.type];
                break;

            case ActionTreeType.TemplateRoot:
                name = `Template: "${propertiesName}"`;
                break;

            default:
                name = propertiesName;
        }

        parentElement = element.parentTree;
    } else {
        name = element.constructor.name;
        parentElement = getParent(element);

        if ((element as ActionModel).isActionModel) {
            const modelId = (element as ActionModel).$modelId;
            name += ` (${modelId.slice(0, 5)})`;
        }
    }

    if (name === "Array") {
        return getActionTreePath(parentElement);
    } else if (parentElement) {
        return getActionTreePath(parentElement) + " > " + name;
    } else {
        return name;
    }
}

function getNonIgnoredActionTreeChildCount(elements: Iterable<any>) {
    let count = 0;
    for (const element of elements) {
        const path = getActionTreePath(element);
        if (!startsWithIgnoredActionTreePath(path)) {
            count++;
        }
    }
    return count;
}

class AnimationReferences {
    public canBeUsedAsPlayerCharacter: boolean;
    public isAnimationOnMap = new Map<MapDataModel, number>();
    public asAnimationOfCharacter = new Array<CharacterReferences>();
    public inAnimationPropertiesValueModel = new Array<AnimationPropertiesValueModel>();

    public constructor(
        public animation: AnimationAssetModel
    ) {
        this.canBeUsedAsPlayerCharacter = animation && animation.isType(AnimationType.BodyType);
    }

    public get isUsed() {
        return (
            this.canBeUsedAsPlayerCharacter ||
            (getNonIgnoredMapCount(this.isAnimationOnMap.keys()) > 0) ||
            (this.asAnimationOfCharacter.filter(characterReferences => characterReferences.isUsed).length > 0) ||
            (getNonIgnoredActionTreeChildCount(this.inAnimationPropertiesValueModel) > 0)
        );
    }

    public get name() {
        if (!this.animation)
            return null;

        const { id, name, metaData: { type } } = this.animation;
        return `Animation #${id} "${name}" (${AnimationType[type]})`;
    }
}

class CharacterReferences {
    public isCharactersOnMap = new Map<MapDataModel, number>();
    public inNPCReferenceModel = new Array<NPCReferenceModel>();
    public asTextReferenceInTranslatedString = new Set<TranslatedString>();

    public constructor(
        public character: CharacterConfigurationModel
    ) {
    }

    public get isUsed() {
        return (
            (getNonIgnoredMapCount(this.isCharactersOnMap.keys()) > 0) ||
            (getNonIgnoredActionTreeChildCount(this.inNPCReferenceModel) > 0) ||
            (getNonIgnoredActionTreeChildCount(this.asTextReferenceInTranslatedString) > 0)
        );
    }

    public get name() {
        if (!this.character)
            return null;

        const { id, localizedName, textReferenceId } = this.character;
        return `Character #${id} "${localizedName.get("de", true)}"` + (textReferenceId ? `, §${textReferenceId}§` : "");
    }
}

const searchOnDeletedMaps = false;
const removeIgnoredElements = true;

export async function checkAnimationsAndCharacters() {
    let actionTrees = (await ActionTree.findAll({ where: { deleted: false } }))
        .map(dbActionTree => dbActionTree.getSnapshotData());

    const actionTreeById = new Map<string, ActionTreeModel>();

    const treeAccess: TreeAccess = {
        getSubTreesForActionTree: () => { throw Error("Not implemented."); },
        getTreeById: (id) => actionTreeById.get(id)
    };

    for (const actionTree of actionTrees) {
        actionTree.treeAccess = treeAccess;
        actionTreeById.set(actionTree.$modelId, actionTree);
    }

    if (removeIgnoredElements) {
        actionTrees = actionTrees.filter(actionTree => !startsWithIgnoredActionTreePath(getActionTreePath(actionTree)));
    }

    const maps = new Map<MapDataModel, GameMap>();

    const whereNotDeleted = { where: { deleted: { [Op.not]: true } } };
    const mapFindOptions = searchOnDeletedMaps ? {} : whereNotDeleted;
    const dbMaps = await GameMap.findAll(mapFindOptions);
    for (const dbMap of dbMaps) {
        const { snapshotData } = dbMap;
        if (removeIgnoredElements && ignoredMaps.has(snapshotData.properties.name))
            continue;

        maps.set(snapshotData, dbMap);
    }

    const animations = (await AnimationAsset.findAll(whereNotDeleted))
        .map(dbAnimation => fromSnapshot<AnimationAssetModel>(dbAnimation.snapshot));

    const characters = (await CharacterConfiguration.findAll(whereNotDeleted))
        .map(dbCharacter => fromSnapshot<CharacterConfigurationModel>(dbCharacter.snapshot));

    logger.info("-------------------------------------------------------------------");
    logger.info("Checking animations and characters!");

    const animationReferencesById = new Map<number, AnimationReferences>();
    const animationReferencesByAnimationName = new Map<string, AnimationReferences>();
    const notFoundAnimationReferencesById = new Map<number, AnimationReferences>();
    const notFoundAnimationReferencesByAnimationName = new Map<string, AnimationReferences>();

    for (const animation of animations) {
        const reference = new AnimationReferences(animation);
        animationReferencesById.set(animation.id, reference);

        if (animationReferencesByAnimationName.has(animation.name)) {
            logger.error("Animation.name is used multiple times: " + animation.name);
        }
        animationReferencesByAnimationName.set(animation.name, reference);
    }

    const getAnimationReferenceById = (id: number) => {
        if (animationReferencesById.has(id))
            return animationReferencesById.get(id);

        if (!notFoundAnimationReferencesById.has(id)) {
            notFoundAnimationReferencesById.set(id, new AnimationReferences(null));
        }

        return notFoundAnimationReferencesById.get(id);
    };

    const getAnimationReferenceByAnimationName = (animationName: string) => {
        if (animationReferencesByAnimationName.has(animationName))
            return animationReferencesByAnimationName.get(animationName);

        if (!notFoundAnimationReferencesByAnimationName.has(animationName)) {
            notFoundAnimationReferencesByAnimationName.set(animationName, new AnimationReferences(null));
        }

        return notFoundAnimationReferencesByAnimationName.get(animationName);
    };

    const characterReferencesById = new Map<number, CharacterReferences>();
    const characterReferencesByTextReferenceId = new Map<string, CharacterReferences>();
    const notFoundCharacterReferencesById = new Map<number, CharacterReferences>();
    const notFoundCharacterReferencesByTextReferenceId = new Map<string, CharacterReferences>();

    for (const character of characters) {
        const reference = new CharacterReferences(character);
        characterReferencesById.set(character.id, reference);

        if (character.textReferenceId) {
            if (characterReferencesByTextReferenceId.has(character.textReferenceId)) {
                logger.error("Character.textReferenceId is used multiple times: " + character.textReferenceId);
            }
            characterReferencesByTextReferenceId.set(character.textReferenceId, reference);
        }
    }

    const getCharacterReferenceById = (id: number) => {
        if (characterReferencesById.has(id))
            return characterReferencesById.get(id);

        if (!notFoundCharacterReferencesById.has(id)) {
            notFoundCharacterReferencesById.set(id, new CharacterReferences(null));
        }

        return notFoundCharacterReferencesById.get(id);
    };

    const getCharacterReferenceByTextReferenceId = (textReference: string) => {
        if (characterReferencesByTextReferenceId.has(textReference))
            return characterReferencesByTextReferenceId.get(textReference);

        if (!notFoundCharacterReferencesByTextReferenceId.has(textReference)) {
            notFoundCharacterReferencesByTextReferenceId.set(textReference, new CharacterReferences(null));
        }

        return notFoundCharacterReferencesByTextReferenceId.get(textReference);
    };

    for (const map of maps.keys()) {
        for (const element of map.dynamicMapElements) {
            // AnimationReferences.isAnimationOnMap
            if (element instanceof DynamicMapElementAnimationElementModel) {
                const reference = getAnimationReferenceByAnimationName(element.animationName);
                const count = reference.isAnimationOnMap.get(map) || 0;
                reference.isAnimationOnMap.set(map, count + 1);
            }

            // CharacterReferences.isCharactersOnMap
            if (element instanceof DynamicMapElementNPCModel) {
                const reference = getCharacterReferenceById(element.characterId);
                const count = reference.isCharactersOnMap.get(map) || 0;
                reference.isCharactersOnMap.set(map, count + 1);
            }
        }
    }

    // AnimationReferences.asAnimationOfCharacter
    for (const character of characters) {
        const reference = getAnimationReferenceByAnimationName(character.animationAssetName);
        reference.asAnimationOfCharacter.push(getCharacterReferenceById(character.id));
    }

    const textReferenceRegex = /§(.*?)§/g;

    for (const actionTree of actionTrees) {
        // AnimationReferences.inAnimationPropertiesValueModel
        for (const animationPropertiesValue of findChildren<AnimationPropertiesValueModel>(actionTree, value => value instanceof AnimationPropertiesValueModel, { deep: true })) {
            const reference = getAnimationReferenceByAnimationName(animationPropertiesValue.value);
            reference.inAnimationPropertiesValueModel.push(animationPropertiesValue);
        }

        // CharacterReferences.inNPCReferenceModel
        for (const npcReference of findChildren<NPCReferenceModel>(actionTree, value => value instanceof NPCReferenceModel, { deep: true })) {
            if (isActionTreeParameter(npcReference.npcId))
                continue;

            const reference = getCharacterReferenceById(+npcReference.npcId);
            reference.inNPCReferenceModel.push(npcReference);
        }

        // CharacterReferences.asTextReferenceInActionNode
        for (const translatedString of findChildren<TranslatedString>(actionTree, value => value instanceof TranslatedString, { deep: true })) {
            for (const translation of translatedString.text.values()) {
                const matches = translation.match(textReferenceRegex);
                if (matches) {
                    for (const match of matches) {
                        const textReferenceId = match.slice(1, -1);
                        const reference = getCharacterReferenceByTextReferenceId(textReferenceId);
                        reference.asTextReferenceInTranslatedString.add(translatedString);
                    }
                }
            }
        }
    }

    function countMatching(map: Map<number | string, AnimationReferences | CharacterReferences>, isUsed: boolean) {
        let count = 0;
        for (const references of map.values()) {
            if (references.isUsed === isUsed) {
                count++;
            }
        }
        return count;
    }

    function matchTitleToCount(count: number, baseTitle: string) {
        if (count > 0) {
            return baseTitle + ` (${count}):`;
        } else {
            return "No " + baseTitle.slice(0, 1).toLowerCase() + baseTitle.slice(1) + ".";
        }
    }

    const prefix1 = "    * ";
    const prefix2 = "       > ";

    function showReferencesOnMap(referencesOnMap: Map<MapDataModel, number>) {
        if (referencesOnMap.size === 0)
            return;

        logger.info(`${prefix1}Used on map:`);
        for (const [map, count] of referencesOnMap) {
            const dbMap = maps.get(map);

            let mapName = `${map.properties.name} (ID#${dbMap.id})` + (dbMap.deleted ? " [deleted]" : "");

            if (ignoredMaps.has(map.properties.name)) {
                mapName = "↓ " + mapName;
            }

            logger.info(`${prefix2}${mapName}: ${count}x`);
        }
    }

    function showReferencesInActionTree(title: string, usedInElements: Array<any>) {
        if (usedInElements.length > 0) {
            logger.info(prefix1 + title + ":");
            for (const usedInElement of usedInElements) {
                let path = getActionTreePath(usedInElement);

                if (startsWithIgnoredActionTreePath(path)) {
                    path = "↓ " + path;
                }

                logger.info(prefix2 + path);
            }
        }
    }

    enum OutputAnimationReferencesMode {
        Used,
        Unused,
        IsUsedInCutscenes
    }

    function outputAnimationReferences(mode: OutputAnimationReferencesMode, notFoundType: string, map: Map<number | string, AnimationReferences>) {
        const unused = mode === OutputAnimationReferencesMode.Unused;
        const count = countMatching(map, !unused);

        if (notFoundType) {
            logger.info(matchTitleToCount(count, `Missing animation assets referenced by ${notFoundType}`));
        } else if (mode === OutputAnimationReferencesMode.IsUsedInCutscenes) {
            logger.info(matchTitleToCount(count, `Used animations in cutscenes`));
        } else if (unused) {
            logger.info(matchTitleToCount(count, `Unused animation assets`));
        } else {
            logger.info(matchTitleToCount(count, `Used animation assets`));
        }

        for (const [key, reference] of map) {
            if (reference.isUsed === unused)
                continue;

            if ((mode === OutputAnimationReferencesMode.IsUsedInCutscenes) && (reference.inAnimationPropertiesValueModel.length === 0))
                continue;

            const { name, canBeUsedAsPlayerCharacter, isAnimationOnMap, asAnimationOfCharacter, inAnimationPropertiesValueModel } = reference;

            logger.info(` - ${name || key}:`);

            if (canBeUsedAsPlayerCharacter) {
                logger.info(prefix1 + "Can be used as player character.");
            }

            showReferencesOnMap(isAnimationOnMap);

            if (asAnimationOfCharacter.length > 0) {
                logger.info(prefix1 + "Used by characters:");
                for (const characterReference of asAnimationOfCharacter) {
                    const character = characterReference.character;
                    const characterIsUsed = characterReference.isUsed;
                    logger.info(`${prefix2}${character.localizedName.get("de")} (ID#${character.id})` + (characterIsUsed ? "" : " [which is unused!]"));
                }
            }

            showReferencesInActionTree("In action trees", inAnimationPropertiesValueModel);
        }

        logger.info("");
    }

    function outputCharacterReferences(unused: boolean, notFoundType: string, map: Map<number | string, CharacterReferences>) {
        const count = countMatching(map, !unused);

        if (notFoundType) {
            logger.info(matchTitleToCount(count, `Missing characters referenced by ${notFoundType}`));
        } else if (unused) {
            logger.info(matchTitleToCount(count, `Unused characters`));
        } else {
            logger.info(matchTitleToCount(count, `Used characters`));
        }

        for (const [key, reference] of map) {
            if (reference.isUsed === unused)
                continue;

            const { name, isCharactersOnMap, inNPCReferenceModel, asTextReferenceInTranslatedString } = reference;

            logger.info(` - ${name || key}:`);
            showReferencesOnMap(isCharactersOnMap);
            showReferencesInActionTree("Directly in action trees", inNPCReferenceModel);
            showReferencesInActionTree("As text reference", Array.from(asTextReferenceInTranslatedString));
        }

        logger.info("");
    }

    notFoundCharacterReferencesById.delete(-1);
    notFoundCharacterReferencesByTextReferenceId.delete("player");

    logger.info("Results:");
    logger.info("--------");
    logger.info("");

    outputAnimationReferences(OutputAnimationReferencesMode.Used, null, animationReferencesById);
    outputAnimationReferences(OutputAnimationReferencesMode.Unused, null, animationReferencesById);
    outputAnimationReferences(OutputAnimationReferencesMode.IsUsedInCutscenes, null, animationReferencesById);
    outputAnimationReferences(OutputAnimationReferencesMode.Used, "animation id", notFoundAnimationReferencesById);
    outputAnimationReferences(OutputAnimationReferencesMode.Used, "animation name", notFoundAnimationReferencesByAnimationName);

    outputCharacterReferences(false, null, characterReferencesById);
    outputCharacterReferences(true, null, characterReferencesById);
    outputCharacterReferences(false, "character id", notFoundCharacterReferencesById);
    outputCharacterReferences(false, "text reference id", notFoundCharacterReferencesByTextReferenceId);

    logger.info("-------------------------------------------------------------------");
}