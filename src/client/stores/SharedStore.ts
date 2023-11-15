import { makeAutoObservable, observable } from "mobx";
import { ActionTreeModel, ActionTreeSnapshot, ActionTreeType, TreeAccess } from "../../shared/action/ActionTreeModel";
import { allTileImageUsages, mainCategoryTags, tileAssetFloorTag, TileAssetModel, TileAssetSnapshot } from "../../shared/resources/TileAssetModel";
import { AnimationAssetModel, AnimationType } from "../../shared/resources/AnimationAssetModel";
import { CharacterConfigurationModel } from "../../shared/resources/CharacterConfigurationModel";
import { wrapIterator } from "../../shared/helper/IterableIteratorWrapper";
import { applySnapshot, fromSnapshot } from "mobx-keystone";
import { dataConstants } from "../../shared/data/dataConstants";
import { TileLayerType } from "../../shared/resources/TileLayerType";
import { editorStore } from "./EditorStore";
import { removeFromTileImageCache } from "../cache/TileImageCache";
import { errorStore } from "./ErrorStore";
import { selectorMapEditorStore, mainMapEditorStore } from "./MapEditorStore";
import { tileAssetEditorStore } from "./TileAssetEditorStore";
import { animationEditorStore } from "./AnimationSelectionStore";
import { registerActionTree } from "../../shared/helper/actionTreeHelper";
import { editorClient } from "../communication/EditorClient";
import { actionEditorStore } from "./ActionEditorStore";
import { routes } from "../data/routes";
import { EventEmitter } from "eventemitter3";
import { doesAnyTagMatchTagSelection, TagSelection, TagType } from "./MapRelatedStore";
import { gameStore } from "./GameStore";

interface SharedStoreEvents {
    addedCharacterConfiguration: (id: number) => void;
    removedCharacterConfiguration: (id: number) => void;
}

export const sharedStoreEventEmitter = new EventEmitter<SharedStoreEvents>();

/**
 * Everything that is shared between any editor *and* the game is put here.
 */
export class SharedStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });

        this.clearActionTrees();
    }

    public tileAssetsInitialized: boolean;
    public allTileAssetsLoaded: boolean;

    public tileAssetDataLoadingPercentage: number = 0;
    public tileAssets: Map<string, TileAssetModel>;

    public animationAssetsLoadingPercentage: number = 0;
    public animationsInitialized: boolean;
    public animationAssets: Map<number, AnimationAssetModel> = observable.map();
    public characterConfigurations: Map<number, CharacterConfigurationModel> = observable.map();

    public actionTreeLoadingPercentage: number = 0;
    public actionTreesInitialized: boolean;
    public subTrees: ActionTreeModel[];
    public modulesRootActionTrees: ActionTreeModel[];
    public actionTreeTemplates: ActionTreeModel[];
    public mainGameRootActionTree: ActionTreeModel;
    public actionTreesById = observable.map<string, ActionTreeModel>();

    public subTreesByParentId = observable.map<string, ActionTreeModel[]>();

    public gameSoundsLoadingPercentage = 0;

    public previousHistoryLocationPathname = routes.editorAction;

    public treeAccess: TreeAccess = {
        getSubTreesForActionTree: (actionTree: ActionTreeModel) => this.subTreesByParentId.get(actionTree.$modelId) || [],
        getTreeById: (modelId: string) => this.actionTreesById.get(modelId)
    };

    public get isInitialized() {
        return this.tileAssetsInitialized && this.actionTreesInitialized && this.animationsInitialized;
    }

    public get mayOpenMap() {
        // Asset loading slows down rapidly when a map is open, so for now, only allow
        // opening maps before loading finishes in development mode
        return this.allTileAssetsLoaded || dataConstants.isDevelopment;
    }

    public get mayOpenGame() {
        // See comment in mayOpenMap()
        return editorStore.isConnectedAndReady && this.allGameSoundsLoaded && this.mayOpenMap;
    }

    public get allGameSoundsLoaded() {
        return this.gameSoundsLoadingPercentage === 1;
    }

    public clear() {
        this.clearActionTrees();
        this.clearTileAssets();
        this.clearAnimationAssets();
        this.clearCharacterConfigurations();
        this.setGameSoundsLoadingPercentage(0);
    }

    public clearTileAssets() {
        this.tileAssets = null;
        this.tileAssetsInitialized = false;
        this.allTileAssetsLoaded = false;
        this.tileAssetDataLoadingPercentage = 0;
    }

    public setTileAssetsInitialized() {
        this.tileAssetsInitialized = true;
    }

    public setAllTileAssetsLoaded() {
        this.allTileAssetsLoaded = true;
    }

    public setGameSoundsLoadingPercentage(value: number) {
        this.gameSoundsLoadingPercentage = value;
    }

    public setResources(tileAssets: Map<string, TileAssetModel>) {
        this.tileAssets = observable.map(tileAssets);
    }

    public addTileAsset(tileAsset: TileAssetModel) {
        this.tileAssets.set(tileAsset.id, tileAsset);
    }

    public updateTileAssetFromSnapshot(snapshot: TileAssetSnapshot) {
        const existingTileAsset = this.tileAssets.get(snapshot.id);
        if (existingTileAsset && (existingTileAsset.$modelId === snapshot.$modelId)) {
            applySnapshot(existingTileAsset, snapshot);
        } else {
            this.addTileAsset(fromSnapshot<TileAssetModel>(snapshot));
        }
    }

    public clearAnimationAssets() {
        this.animationAssets.clear();
        this.animationAssetsLoadingPercentage = 0;
        this.animationsInitialized = false;
    }

    public setAnimationAssetLoadingPercentage(value: number) {
        this.animationAssetsLoadingPercentage = value;
    }

    public setAnimationsInitialized() {
        this.animationAssetsLoadingPercentage = 1;
        this.animationsInitialized = true;
    }

    public setAnimations(animations: Map<number, AnimationAssetModel>) {
        this.animationAssets = observable.map(animations);
    }

    public setAnimation(animation: AnimationAssetModel) {
        this.animationAssets = observable.map(new Map(this.animationAssets.set(animation.id, animation)));
    }

    public deleteAnimation(animationId: number) {
        this.animationAssets?.delete(animationId);
        this.animationAssets = observable.map(new Map(this.animationAssets));

        if (animationEditorStore.selectedAnimation?.animation.id === animationId) {
            animationEditorStore.setSelectedAnimation(null).catch(errorStore.addErrorFromErrorObject);
        }
    }

    public getAnimation(animationId: number): AnimationAssetModel {
        return this.animationAssets?.get(animationId);
    }

    public getAnimationsByType(animationType: AnimationType): AnimationAssetModel[] {
        if (this.animationAssets) return wrapIterator(this.animationAssets.values()).filter(a => a.isType(animationType));
        return [];
    }

    public getAnimationByName(name: string): AnimationAssetModel {
        return wrapIterator(this.animationAssets.values()).find(a => a.name === name);
    }

    public clearCharacterConfigurations() {
        this.characterConfigurations.forEach(characterConfiguration => sharedStoreEventEmitter.emit("removedCharacterConfiguration", characterConfiguration.id));
        this.characterConfigurations.clear();
    }

    /**
     * Returns an {@link AnimationAssetModel} of the type {@link AnimationType.BodyType}
     * that is used by the assigned {@link CharacterConfigurationModel} or null.
     * If includingNPC = true is assigned it also returns animations of the type {@link AnimationType.NPC}.
     * @param characterConfiguration The config to search the animation.
     * @param includingNPC
     */
    public getCharacterAnimation(characterConfiguration: CharacterConfigurationModel, includingNPC = false): AnimationAssetModel {
        if (characterConfiguration) {
            const animation = this.getAnimationByName(characterConfiguration.animationAssetName);
            if (animation && (animation.isType(AnimationType.BodyType)
                || (includingNPC && animation.isType(AnimationType.NPC)))) {
                return animation;
            }
        }
        return null;
    }

    public getCharactersWithMissingAnimationReference(includingNPC = false): CharacterConfigurationModel[] {
        const charsWithMissingAnimationReference: CharacterConfigurationModel[] = [];
        this.characterConfigurations?.forEach(c => {
            const animation = this.getCharacterAnimation(c, includingNPC);
            if (!animation) {
                charsWithMissingAnimationReference.push(c);
            }
        });
        return charsWithMissingAnimationReference;
    }

    public setCharacters(characters: Map<number, CharacterConfigurationModel>) {
        this.characterConfigurations.forEach(characterConfiguration => sharedStoreEventEmitter.emit("removedCharacterConfiguration", characterConfiguration.id));
        this.characterConfigurations = observable.map(characters);
        this.characterConfigurations.forEach(characterConfiguration => sharedStoreEventEmitter.emit("addedCharacterConfiguration", characterConfiguration.id));
    }

    public getCharacter(id: number): CharacterConfigurationModel {
        return this.characterConfigurations.get(id);
    }

    public getCharacters() {
        return Array.from(this.characterConfigurations.values());
    }

    public getCharacterByReferenceId(textReferenceId: string): CharacterConfigurationModel {
        return wrapIterator(this.characterConfigurations.values()).find(a => a.textReferenceId === textReferenceId);
    }

    public putCharacter(character: CharacterConfigurationModel) {
        if (!this.characterConfigurations.get(character.id)) {
            this.characterConfigurations.set(character.id, character);
            sharedStoreEventEmitter.emit("addedCharacterConfiguration", character.id);
        }
    }

    public deleteCharacter(characterId: number) {
        this.characterConfigurations?.delete(characterId);
        sharedStoreEventEmitter.emit("removedCharacterConfiguration", characterId);
    }

    public getCharactersThatReferencingAnimation(animationName: string): CharacterConfigurationModel[] {
        return wrapIterator(this.characterConfigurations.values())
            .filter(c => c.animationAssetName == animationName);
    }

    public setTileAssetDataLoadingPercentage(value: number) {
        this.tileAssetDataLoadingPercentage = value;
    }

    public isTileAssetIdUsed(id: string) {
        return this.tileAssets.has(id);
    }

    public getTileAsset(tileAssetId: string) {
        return this.tileAssets?.get(tileAssetId);
    }

    public deleteTileAsset(id: string) {
        mainMapEditorStore.clearTileSelectionIfMatches(id);
        selectorMapEditorStore.clearTileSelectionIfMatches(id);
        tileAssetEditorStore.clearTileSelectionIfMatches(id);
        this.tileAssets.delete(id);

        for (const tileImageUsage of allTileImageUsages) {
            removeFromTileImageCache(id, tileImageUsage).catch(errorStore.addErrorFromErrorObject);
        }
    }

    public getFilteredTileAssets(layerType: TileLayerType, plane: number, showPlaneTransit: boolean, includeTags: TagSelection[], excludeTags: TagSelection[], search: string, additionalFilter: (tileAsset: TileAssetModel) => boolean) {
        if (!this.tileAssets)
            return [];

        if (search) {
            search = search.toLowerCase();
        }

        return wrapIterator(this.tileAssets.values()).filter(tileAsset =>
            ((layerType == null) || (tileAsset.layerType == layerType)) &&
            ((plane === null) || tileAsset.isMadeForPlane(plane)) &&
            (showPlaneTransit || !tileAsset.planeTransit) &&
            (!includeTags || includeTags.every(tag => doesAnyTagMatchTagSelection(tag, tileAsset.tags))) &&
            (!excludeTags || excludeTags.every(tag => !doesAnyTagMatchTagSelection(tag, tileAsset.tags))) &&
            (!search || tileAsset.localizedName.get(gameStore.languageKey).toLowerCase().includes(search)) &&
            (!additionalFilter || additionalFilter(tileAsset))
        );
    }

    public get hasFloorCategoryTiles() {
        if (!this.tileAssets)
            return false;

        for (const tileAsset of this.tileAssets.values()) {
            if (tileAsset.tags.includes(tileAssetFloorTag))
                return true;
        }

        return false;
    }

    public get hasTilesWithoutMainCategory() {
        if (!this.tileAssets)
            return false;

        for (const tileAsset of this.tileAssets.values()) {
            if (!mainCategoryTags.some(tag => tileAsset.tags.includes(tag)))
                return true;
        }

        return false;
    }

    public setActionTreeLoadingPercentage(value: number) {
        this.actionTreeLoadingPercentage = value;
    }

    public clearActionTrees() {
        if (this.actionTreesInitialized) {
            editorClient.stopTrackingAllActionTrees();
        }

        this.actionTreesInitialized = false;
        this.actionTreeLoadingPercentage = 0;

        this.actionTreeTemplates = [];
        this.subTrees = [];
        this.subTreesByParentId.clear();
        this.actionTreesById.clear();

        const temporaryUnregisteredTree = ActionTreeModel.createEmptyPrototype();
        temporaryUnregisteredTree.setType(ActionTreeType.MainGameRoot);
        this.mainGameRootActionTree = temporaryUnregisteredTree;
    }

    public setActionTrees(actionTrees: ActionTreeModel[]) {
        actionTrees.forEach(actionTree => this.registerActionTree(actionTree));

        this.mainGameRootActionTree = actionTrees.find(t => t.type === ActionTreeType.MainGameRoot);
        this.actionTreeTemplates = actionTrees.filter(t => t.type === ActionTreeType.TemplateRoot);
        this.subTrees = actionTrees.filter(t => t.type === ActionTreeType.SubTree);
        this.modulesRootActionTrees = actionTrees.filter(t => t.type === ActionTreeType.ModuleRoot);

        this.actionTreesInitialized = true;
    }

    public addActionTreesFromSnapshots(actionTreeSnapshots: ActionTreeSnapshot[]) {
        actionTreeSnapshots.forEach(snapshot => this.addActionTree(fromSnapshot<ActionTreeModel>(snapshot)));
    }

    public addActionTree(actionTree: ActionTreeModel) {
        this.registerActionTree(actionTree);

        switch (actionTree.type) {
            case ActionTreeType.TemplateRoot:
                this.actionTreeTemplates.push(actionTree);
                break;

            case ActionTreeType.SubTree:
                this.subTrees.push(actionTree);
                break;

            case ActionTreeType.ModuleRoot:
                this.modulesRootActionTrees.push(actionTree);
                break;

            default:
                throw Error("Not implemented: " + actionTree.type);
        }
    }

    public removeActionTrees(actionTreeIds: string[]) {
        actionTreeIds.forEach(id => this.removeActionTree(id));
    }

    public removeActionTree(actionTreeId: string) {
        const actionTree = this.actionTreesById.get(actionTreeId);
        this.actionTreesById.delete(actionTreeId);

        actionEditorStore.onActionTreeRemoved(actionTree);

        const templateIndex = this.actionTreeTemplates.findIndex(t => t.$modelId === actionTreeId);
        if (templateIndex !== -1) {
            editorClient.stopTrackingActionTree(this.actionTreeTemplates[templateIndex]);
            this.actionTreeTemplates.splice(templateIndex, 1);
            return;
        }

        const subTreeIndex = this.subTrees.findIndex(t => t.$modelId === actionTreeId);
        if (subTreeIndex !== -1) {
            const subTree = this.subTrees[subTreeIndex];
            editorClient.stopTrackingActionTree(subTree);

            const subTreesForThisParent = this.subTreesByParentId.get(subTree.activeParentModelId);
            subTreesForThisParent.splice(subTreesForThisParent.indexOf(subTree), 1);

            this.subTrees.splice(subTreeIndex, 1);
            return;
        }

        console.error("Tried to remove an action tree that didn't exist: " + actionTreeId);
    }

    private registerActionTree(actionTree: ActionTreeModel, startTracking: boolean = true) {
        this.actionTreesById.set(actionTree.$modelId, actionTree);

        editorClient.startTrackingActionTree(actionTree);

        return registerActionTree(actionTree, this.subTreesByParentId, this.treeAccess);
    }

    public prepareMainGameRootActionTreesForGame() {
        if (!this.modulesRootActionTrees) // is null in tests
            return;

        for (const tree of this.modulesRootActionTrees) {
            tree.temporaryParentModelId = this.mainGameRootActionTree.$modelId;
        }
    }

    public restoreMainGameRootActionTreesAfterGame() {
        if (!this.modulesRootActionTrees) // is null in tests
            return;

        for (const tree of this.modulesRootActionTrees) {
            tree.temporaryParentModelId = null;
        }
    }

    public restoreTreeAccessAssignments() {
        for (const actionTree of this.actionTreesById.values()) {
            actionTree.treeAccess = this.treeAccess;
        }
    }

    public setPreviousHistoryLocationPathname(pathname: string) {
        this.previousHistoryLocationPathname = pathname;
    }
}

export const sharedStore = new SharedStore();
