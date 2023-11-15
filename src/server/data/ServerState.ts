import { ImageVersions, MapList, TileAssetImageVersions } from "../../shared/definitions/socket.io/socketIODefinitions";
import { allTileImageUsages, keyToTileImageIdentification } from "../../shared/resources/TileAssetModel";
import { CombatConfiguration } from "../database/models/CombatConfiguration";
import { GameMap } from "../database/models/GameMap";
import { TileAsset } from "../database/models/TileAsset";
import { MapWithMetaData } from "./MapWithMetaData";
import { AnimationAsset } from "../database/models/AnimationAsset";
import { CharacterConfiguration } from "../database/models/CharacterConfiguration";
import { ActionTreeWithMetaData } from "./ActionTreeWithMetaData";
import { ActionTree } from "../database/models/ActionTree";
import { Item } from "../database/models/Item";
import { ItemSnapshot } from "../../shared/game/ItemModel";
import { Image } from "../database/models/Image";
import { Workshop } from "../database/models/Workshop";
import { Module } from "../database/models/Module";
import { wrapIterator } from "../../shared/helper/IterableIteratorWrapper";
import { AtlasData } from "../../shared/definitions/other/AtlasData";
import { GameDesignVariables } from "../database/models/GameDesignVariables";
import { ThumbnailCatalogue } from "../../shared/definitions/other/ThumbnailCatalogue";
import { loadFileList } from "../helper/fileUtil";
import { SOUND_FOLDER, SOUND_TYPES } from "../config";
import { ParsedPath } from "path";
import { WorkshopSnapshot } from "../../shared/workshop/WorkshopModel";
import { ModuleMapData, ModuleSnapshot } from "../../shared/workshop/ModuleModel";
import { ActionTreeSnapshot, ActionTreeType } from "../../shared/action/ActionTreeModel";
import { EventEmitter } from "eventemitter3";
import { MakeshiftTranslationSystemData } from "../database/models/MakeshiftTranslationSystemData";

interface ServerStoreEvents {
    updatedMapList: () => void;
}

export class ServerState extends EventEmitter<ServerStoreEvents> {
    private _workshops = new Map<string, Workshop>();
    private _modules = new Map<string, Module>();
    public combatConfiguration: CombatConfiguration;
    public gameDesignVariables: GameDesignVariables;
    public tileAssets = new Map<string, TileAsset>();
    public animationAssets = new Map<number, AnimationAsset>();
    public items = new Map<string, Item>();
    public images = new Map<number, Image>();
    public readonly actionTreesWithMetadata = new Map<string, ActionTreeWithMetaData>();
    public readonly mapsWithMetaData = new Array<MapWithMetaData>();
    public characterConfigurations = new Map<number, CharacterConfiguration>();
    public readonly tileAtlasDataArray = new Array<AtlasData>();
    public thumbnailCatalogue: ThumbnailCatalogue = {};
    public soundFiles = new Array<ParsedPath>();
    public makeshiftTranslationSystemData: MakeshiftTranslationSystemData;

    public setAllWorkshops(workshops: Workshop[]) {
        this._workshops = new Map(workshops.map(workshop => [workshop.id, workshop]));
    }

    public setAllModules(modules: Module[]) {
        this._modules = new Map(modules.map(module => [module.id, module]));
    }

    public getActiveWorkshop(id: string) {
        const workshop = this._workshops.get(id);
        if (!workshop || workshop.deleted)
            return null;

        return workshop;
    }

    public getActiveModule(id: string) {
        const module = this._modules.get(id);
        if (!module || module.deleted)
            return null;

        return module;
    }

    public getActiveOrDeletedWorkshop(id: string) {
        return this._workshops.get(id);
    }

    public getActiveOrDeletedModule(id: string) {
        return this._modules.get(id);
    }

    public get activeWorkshops() {
        return wrapIterator(this._workshops.values()).filter(workshop => !workshop.deleted);
    }

    public get activeModules() {
        return wrapIterator(this._modules.values()).filter(module => !module.deleted);
    }

    public get activeAndDeletedWorkshops() {
        return Array.from(this._workshops.values());
    }

    public get activeAndDeletedModules() {
        return Array.from(this._modules.values());
    }

    public addWorkshopViaSnapshot(workshopSnapshot: WorkshopSnapshot) {
        const newWorkshop = new Workshop;
        newWorkshop.id = workshopSnapshot.$modelId;
        newWorkshop.deleted = false;
        newWorkshop.snapshotJSONString = JSON.stringify(workshopSnapshot);
        this._workshops.set(workshopSnapshot.$modelId, newWorkshop);
    }

    public getWorkshopViaAccessCode(workshopAccesscode: string) {
        return this.activeWorkshops.find(workshop => workshop.snapshot.accesscode == workshopAccesscode);
    }

    public addModuleViaSnapshot(moduleSnapshot: ModuleSnapshot) {
        const newModule = new Module;
        newModule.id = moduleSnapshot.$modelId;
        newModule.deleted = false;
        newModule.snapshotJSONString = JSON.stringify(moduleSnapshot);
        this._modules.set(moduleSnapshot.$modelId, newModule);
    }

    public getActiveModuleViaAccessCode(moduleAccesscode: string) {
        return this.activeModules.find(module => module.snapshot.accesscode == moduleAccesscode);
    }

    public getActiveWorkshopViaModuleId(moduleId: string) {
        const module = this.getActiveModule(moduleId);
        if (!module)
            return null;

        const workshopId = module.snapshot.workshopId;
        return this.getActiveWorkshop(workshopId);
    }

    public getActiveWorkshopViaPlayAccessCode(playAccesscode: string) {
        return this.activeWorkshops.find(workshop => workshop.snapshot.playcode == playAccesscode);
    }

    public getActiveModuleViaStandalonePlayAccessCode(playAccesscode: string) {
        return this.activeModules.find(({ snapshot }) => snapshot.isStandalone && snapshot.standalonePlayCode == playAccesscode);
    }

    public getActiveModulesFromList(moduleIds: string[]) {
        return this.activeModules.filter(({ snapshot }) => moduleIds.includes(snapshot.$modelId));
    }

    public accessCodeExists(accesscode: string, includeAdminPassword: boolean) {
        if (accesscode.length === 0)
            return false;

        if (includeAdminPassword && (accesscode === process.env.ACCESS_CODE))
            return true;

        if (this.activeWorkshops.some(({ snapshot }) => snapshot.accesscode === accesscode || snapshot.playcode === accesscode))
            return true;

        if (this.activeModules.some(({ snapshot }) => snapshot.accesscode === accesscode || snapshot.standalonePlayCode === accesscode))
            return true;

        return false;
    }

    public addItemViaSnapshot(itemSnapshot: ItemSnapshot) {
        const newDBItem = new Item;
        newDBItem.id = itemSnapshot.id;
        newDBItem.deleted = false;
        newDBItem.snapshotJSONString = JSON.stringify(itemSnapshot);
        this.items.set(itemSnapshot.id, newDBItem);
    }

    public createAndAddMapWithMetaData(gameMap: GameMap) {
        const mapWithMetaData = new MapWithMetaData(gameMap);
        this.mapsWithMetaData.push(mapWithMetaData);
        return mapWithMetaData;
    }

    public createAndAddActionTreeWithMetaData(actionTree: ActionTree) {
        const actionTreeWithMetaData = new ActionTreeWithMetaData(actionTree);
        this.actionTreesWithMetadata.set(actionTree.id, actionTreeWithMetaData);
    }

    public getRelevantActionTreeSnapshots(moduleIds: string[]) {
        const notDeletedActionTreeSnapshots = wrapIterator(this.actionTreesWithMetadata.values())
            .filter(actionTree => !actionTree.actionTree.deleted)
            .map(actionTree => actionTree.actionTreeSnapshot);

        const actionTreeChildrenById = new Map<string, ActionTreeSnapshot[]>();

        for (const actionTreeSnapshot of notDeletedActionTreeSnapshots) {
            actionTreeChildrenById.set(actionTreeSnapshot.$modelId, []);
        }

        for (const actionTreeSnapshot of notDeletedActionTreeSnapshots) {
            const { parentModelId } = actionTreeSnapshot;
            if (!parentModelId)
                continue;

            if (!actionTreeChildrenById.has(parentModelId)) {
                actionTreeChildrenById.set(parentModelId, [actionTreeSnapshot]);
            } else {
                actionTreeChildrenById.get(parentModelId).push(actionTreeSnapshot);
            }
        }

        const result = new Array<ActionTreeSnapshot>();

        // Add MainGameRoot/TemplateRoot and children
        for (const actionTreeSnapshot of notDeletedActionTreeSnapshots.filter(actionTree => (actionTree.type === ActionTreeType.MainGameRoot) || (actionTree.type === ActionTreeType.TemplateRoot))) {
            ServerState.addActionTreeAndChildren(actionTreeSnapshot, actionTreeChildrenById, result);
        }

        // Add module ModuleRoot and children
        for (const moduleId of moduleIds) {
            const module = this.getActiveModule(moduleId);
            if (!module)
                throw Error("Module wasn't found in getRelevantActionTreeSnapshots: " + moduleId);

            const actionTree = this.actionTreesWithMetadata.get(module.snapshot.actiontreeId);
            ServerState.addActionTreeAndChildren(actionTree.actionTreeSnapshot, actionTreeChildrenById, result);
        }

        return result;
    }

    private static addActionTreeAndChildren(actionTreeSnapshot: ActionTreeSnapshot, actionTreeChildrenById: Map<string, ActionTreeSnapshot[]>, result: Array<ActionTreeSnapshot>) {
        result.push(actionTreeSnapshot);
        const children = actionTreeChildrenById.get(actionTreeSnapshot.$modelId);
        if (children) {
            for (const child of children) {
                ServerState.addActionTreeAndChildren(child, actionTreeChildrenById, result);
            }
        }
    }

    public sortMaps() {
        this.mapsWithMetaData.sort((a, b,) => a.mapId - b.mapId);
    }

    public removeAndDisposeMapWithMetaData(mapWithMetaData: MapWithMetaData) {
        const indexInArray = this.mapsWithMetaData.indexOf(mapWithMetaData);
        this.mapsWithMetaData.splice(indexInArray, 1);
        mapWithMetaData.dispose();
    }

    public getMapById(id: number) {
        return this.mapsWithMetaData.find(mapWithMetaData => mapWithMetaData.mapId === id);
    }

    public getIdsOfMapsNotOwnedByAModule() {
        return this.mapsWithMetaData
            .filter(mapWithMetaData => !mapWithMetaData.moduleOwnerId)
            .map(mapWithMetaData => mapWithMetaData.mapId);
    }

    public getModuleMapList(): ModuleMapData[] {
        return this.mapsWithMetaData
            .filter(mapWithMetaData => mapWithMetaData.moduleOwnerId)
            .map(mapWithMetaData => ({
                id: mapWithMetaData.mapId,
                name: mapWithMetaData.mapSnapshot.properties.name,
                moduleId: mapWithMetaData.moduleOwnerId
            }));
    }

    public pruneTileAtlasDataArray(tileAssetImageVersions: TileAssetImageVersions) {
        for (const atlas of this.tileAtlasDataArray) {
            const deleteKeys = new Array<string>();

            for (const frameId in atlas.frames) {
                const { id, tileImageUsage, version } = keyToTileImageIdentification(frameId);
                if (!tileAssetImageVersions[id] || (tileAssetImageVersions[id][tileImageUsage] !== version)) {
                    deleteKeys.push(frameId);
                }
            }

            for (const frameId of deleteKeys) {
                delete atlas.frames[frameId];
            }
        }

        return this.tileAtlasDataArray;
    }

    public generateTileAssetVersions() {
        const versions: TileAssetImageVersions = {};

        for (const tileAsset of this.tileAssets.values()) {
            if (tileAsset.deleted)
                continue;

            const imagePropertiesArray = tileAsset.snapshot.imageAssets;
            if (!imagePropertiesArray)
                continue;

            const versionsForTileAsset: ImageVersions = {};
            for (const tileImageUsage of allTileImageUsages) {
                if (imagePropertiesArray[tileImageUsage]) {
                    versionsForTileAsset[tileImageUsage] = tileAsset.getImageDataVersion(tileImageUsage);
                }
            }
            versions[tileAsset.id] = versionsForTileAsset;
        }

        return versions;
    }

    public hasAnimationAssetWithName(name: string): boolean {
        return wrapIterator(this.animationAssets.values()).some(animation => animation.name == name);
    }

    public async loadSoundFileList() {
        this.soundFiles = await loadFileList(SOUND_FOLDER, SOUND_TYPES);
    }
}
