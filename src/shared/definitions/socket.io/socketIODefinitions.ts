import { ActionTreeSnapshot } from "../../action/ActionTreeModel";
import { CombatConfigurationSnaphot } from "../../combat/CombatConfigurationModel";
import { MapDataSnapshot } from "../../game/MapDataModel";
import { AugmentedPatch, PatchCheckResult } from "../../helper/mobXHelpers";
import { TileImageUsage, TileAssetSnapshot } from "../../resources/TileAssetModel";
import { TranslatedError } from "../errors/TranslatedError";
import { AnimationAssetSnapshot } from "../../resources/AnimationAssetModel";
import { CharacterConfigurationSnapshot } from "../../resources/CharacterConfigurationModel";
import { ImageSnapshot } from "../../resources/ImageModel";
import { ItemSnapshot } from "../../game/ItemModel";
import { ChangeableTileDataSnapshot } from "../../game/TileDataModel";
import { AtlasData } from "../other/AtlasData";
import { GameDesignVariablesSnapshot } from "../../game/GameDesignVariablesModel";
import { ThumbnailCatalogue } from "../other/ThumbnailCatalogue";
import { ParsedPath } from "path";
import { WorkshopSnapshot } from "../../workshop/WorkshopModel";
import { ModuleMapData, ModuleSnapshot, PlayableModule, ReadonlyEditorModule } from "../../workshop/ModuleModel";
import { MakeshiftTranslationSystemDataSnapshot } from "../../translation/MakeshiftTranslationSystemDataModel";

/* -------------- */
/* -- MESSAGES -- */
/* -------------- */

type ErrorOnlyCallback = (error: SocketIOError) => void;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SharedClientToServerEvents {
}

export interface SharedServerToClientEvents {
    serverShutdown: () => void;
}

export type EditorClientToServerEvents = SharedClientToServerEvents & {
    startInitialization: (callback: ErrorOnlyCallback) => void;
    setUsername: (username: string, callback: ErrorOnlyCallback) => void;
    getNextAllTileAssetsUpdatedChunk: (callback: (error: SocketIOError, tileAssetSnapshots: TileAssetSnapshot[]) => void) => void;
    getNextAllActionTreesUpdatedChunk: (callback: (error: SocketIOError, actionTreeSnapshots: ActionTreeSnapshot[]) => void) => void;
    updateTileAsset: (tileAssetSnapshot: TileAssetSnapshot, backgroundImageData: ArrayBuffer, waterMaskImageData: ArrayBuffer, foregroundImageData: ArrayBuffer, waterMaskForegroundImageData: ArrayBuffer, callback: ErrorOnlyCallback) => void;
    deleteTileAsset: (id: string, callback: ErrorOnlyCallback) => void;
    getTileAssetImage: (id: string, usage: TileImageUsage, callback: (error: SocketIOError, imageData: ArrayBufferWithVersion) => void) => void;
    getTileAssetImageAtlasImage: (atlasImageName: string, callback: (error: SocketIOError, image: ArrayBuffer) => void) => void;
    createNewMap: (mapName: string, callback: (error: SocketIOError, id: number, mapSnapshot: MapDataSnapshot) => void) => void;
    createCharacterConfiguration: (snapshot: CharacterConfigurationSnapshot, callback: (error: SocketIOError, characterConfigurationSnapshot: CharacterConfigurationSnapshot) => void) => void;
    updateCharacterConfiguration: (snapshot: CharacterConfigurationSnapshot, callback: (error: SocketIOError, characterConfigurationSnapshot: CharacterConfigurationSnapshot) => void) => void;
    deleteCharacterConfiguration: (id: number, callback: ErrorOnlyCallback) => void;
    unDeleteCharacterConfiguration: (id: number, callback: (error: SocketIOError, characterConfigSnapshot: CharacterConfigurationSnapshot) => void) => void;
    submitCharacterConfigurationChanges: (id: number, patches: AugmentedPatch[], inverseAugmentedPatches: AugmentedPatch[], callback: ErrorOnlyCallback) => void;
    createAnimationAsset: (snapshot: AnimationAssetSnapshot, skeletonData: ArrayBuffer, imageData: ArrayBuffer, atlasData: ArrayBuffer, callback: (error: SocketIOError, animationAssetSnapshot: AnimationAssetSnapshot) => void) => void;
    deleteAnimationAsset: (id: number, callback: ErrorOnlyCallback) => void;
    submitAnimationChanges: (id: number, patches: AugmentedPatch[], inversePatches: AugmentedPatch[], callback: ErrorOnlyCallback) => void;
    unDeleteAnimationAsset: (id: number, callback: (error: SocketIOError, animationAssetSnapshot: AnimationAssetSnapshot) => void) => void;
    loadMap: (id: number, callback: (error: SocketIOError, mapSnapshot: MapDataSnapshot) => void) => void;
    setCurrentMap: (id: number, callback: (error: SocketIOError, userList: UserList) => void) => void;
    closeCurrentMap: (callback: ErrorOnlyCallback) => void;
    deleteMap: (id: number, callback: ErrorOnlyCallback) => void;
    undeleteMap: (id: number, callback: ErrorOnlyCallback) => void;
    submitDynamicMapElementsChanges: (id: number, patches: AugmentedPatch[], inversePatches: AugmentedPatch[], callback: ErrorOnlyCallback) => void;
    submitCurrentMapPropertyChanges: (id: number, patch: AugmentedPatch, inversePatch: AugmentedPatch, callback: ErrorOnlyCallback) => void;
    setTiles: (id: number, tiles: NewAndOldChangeableTileDataSnapshotWithPosition[], plane: number, callback: ErrorOnlyCallback) => void;
    submitCombatConfigurationChanges: (patches: AugmentedPatch[], inversePatches: AugmentedPatch[], callback: (error: SocketIOError) => void) => void;
    submitGameDesignVariablesChanges: (patch: AugmentedPatch, inversePatch: AugmentedPatch, callback: (error: SocketIOError) => void) => void;
    submitMakeshiftTranslationSystemDataChanges: (patch: AugmentedPatch, inversePatch: AugmentedPatch, callback: (error: SocketIOError) => void) => void;
    createActionTrees: (actionTreeSnapshots: ActionTreeSnapshot[], callback: ErrorOnlyCallback) => void;
    deleteActionTrees: (actionTreeSnapshots: ActionTreeSnapshot[], callback: ErrorOnlyCallback) => void;
    undeleteActionTrees: (actionTreeModelIds: string[], callback: ErrorOnlyCallback) => void;
    submitActionTreeChanges: (actionTreeModelId: string, patches: AugmentedPatch[], inversePatches: AugmentedPatch[], executeAsManyAsPossible: boolean, callback: (error: SocketIOError, patchResultsForExecuteAsManyAsPossible: PatchCheckResult[]) => void) => void;
    createItem: (itemSnapshot: ItemSnapshot, callback: ErrorOnlyCallback) => void;
    deleteItem: (itemId: string, callback: ErrorOnlyCallback) => void;
    unDeleteItem: (itemId: string, callback: ErrorOnlyCallback) => void;
    submitItemChanges: (itemId: string, patch: AugmentedPatch, inverseAugmentedPatch: AugmentedPatch, callback: (error: SocketIOError) => void) => void;
    createImage: (clientImageSnapshot: ImageSnapshot, imageData: ArrayBuffer, callback: (error: SocketIOError, imageSnapshot: ImageSnapshot) => void) => void;
    deleteImage: (id: number, callback: ErrorOnlyCallback) => void;
    undeleteImage: (id: number, callback: ErrorOnlyCallback) => void;
    log: (logLevel: LogLevel, message: any, meta?: any) => void;
    getSoundFileList: (callback: (error: SocketIOError, list: ParsedPath[]) => void) => void;
};

export type EditorServerToClientEvents = SharedServerToClientEvents & {
    initializeClient: (userId: number, serverGitCommitSHA: string, combatConfigurationSnaphot: CombatConfigurationSnaphot, gameDesignVariablesSnapshot: GameDesignVariablesSnapshot, makeshiftTranslationSystemData: MakeshiftTranslationSystemDataSnapshot, sessionModule: ReadonlyEditorModule, soundList: Array<ParsedPath>) => void;
    setInitializationPercentage: (value: number) => void;
    initializationFinished: (standaloneModuleStartMapId: number) => void;
    allTileAssetsUpdated: (tileAssetChunkCount: number, versions: TileAssetImageVersions, tileAtlasDataArray: AtlasData[], thumbnailCatalogue: ThumbnailCatalogue) => void;
    allAnimationAssetsUpdated: (animationsSnapshots: AnimationAssetSnapshot[]) => void;
    allCharacterConfigurationsUpdated: (characterSnapshots: CharacterConfigurationSnapshot[]) => void;
    characterConfigurationCreated: (characterSnapshot: CharacterConfigurationSnapshot) => void;
    characterConfigurationChanged: (characterConfigId: number, patches: AugmentedPatch[]) => void;
    characterConfigurationDeleted: (id: number) => void;
    characterConfigurationUnDeleted: (characterSnapshot: CharacterConfigurationSnapshot) => void;
    animationAssetCreated: (animationSnapshot: AnimationAssetSnapshot) => void;
    animationAssetDeleted: (id: number) => void;
    animationAssetChanged: (id: number, patches: AugmentedPatch[]) => void;
    animationAssetUnDeleted: (animationSnapshot: AnimationAssetSnapshot) => void;
    tileAssetUpdated: (tileAssetSnapshot: TileAssetSnapshot, backgroundImageData: ArrayBufferWithVersion, waterMaskImageData: ArrayBufferWithVersion, foregroundImageData: ArrayBufferWithVersion, waterMaskForegroundImageData: ArrayBufferWithVersion) => void;
    tileAssetDeleted: (id: string) => void;
    mapListUpdated: (mapList: MapList) => void;
    mapDeleted: (id: number, deletedByThisUser: boolean) => void;
    currentMapUserListUpdated: (userList: UserList) => void;
    mapDynamicMapElementsChanged: (mapId: number, patches: AugmentedPatch[]) => void;
    mapPropertiesChanged: (mapId: number, patch: AugmentedPatch) => void;
    tilesUpdated: (mapId: number, tiles: ChangeableTileDataSnapshotWithPosition[], plane: number) => void;
    combatConfigurationChanged: (patches: AugmentedPatch[]) => void;
    gameDesignVariablesChanged: (patch: AugmentedPatch) => void;
    MakeshiftTranslationSystemDataChanged: (patch: AugmentedPatch) => void;
    allActionTreesUpdated: (actionTreeCount: number) => void;
    actionTreesCreated: (actionTreeSnapshots: ActionTreeSnapshot[]) => void;
    actionTreesDeleted: (actionTreeModelIds: string[]) => void;
    actionTreeChanged: (actionTreeModelId: string, patches: AugmentedPatch[]) => void;
    allItemsUpdated: (itemSnapshots: ItemSnapshot[]) => void;
    itemUpdated: (itemSnapshot: ItemSnapshot) => void;
    itemDeleted: (itemId: string) => void;
    itemChanged: (itemId: string, patch: AugmentedPatch) => void;
    allImagesUpdated: (imageSnapshots: ImageSnapshot[]) => void;
    imageCreated: (imageSnapshot: ImageSnapshot, imageData: ArrayBuffer) => void;
    imageDeleted: (imageId: number) => void;
};

export type ManagementClientToServerEvents = SharedClientToServerEvents & {
    startManagementInitialization: (callback: ErrorOnlyCallback) => void;
    createWorkshop: (callback: (error: SocketIOError, workshop: WorkshopSnapshot) => void) => void;
    deleteWorkshop: (workshopId: string, callback: ErrorOnlyCallback) => void;
    unDeleteWorkshop: (workshopId: string, callback: ErrorOnlyCallback) => void;
    submitWorkshopChanges: (workshopId: string, patch: AugmentedPatch, inverseAugmentedPatch: AugmentedPatch, callback: (error: SocketIOError) => void) => void;
    createModule: (workshopId: string, callback: (error: SocketIOError, module: ModuleSnapshot) => void) => void;
    deleteModule: (moduleId: string, callback: ErrorOnlyCallback) => void;
    unDeleteModule: (moduleId: string, callback: ErrorOnlyCallback) => void;
    submitModuleChanges: (moduleId: string, patch: AugmentedPatch, inverseAugmentedPatch: AugmentedPatch, callback: (error: SocketIOError) => void) => void;
    requestModuleMapListsUpdate: (callback: (error: SocketIOError) => void) => void;
};

export type ManagementServerToClientEvents = SharedServerToClientEvents & {
    initializeManagement: (serverGitCommitSHA: string, sessionWorkshopId: string) => void;
    initializeManagementFinished: () => void;
    allWorkshopsUpdated: (workshopSnapshots: WorkshopSnapshot[]) => void;
    workshopUpdated: (workshopSnapshot: WorkshopSnapshot, moduleSnapshots: ModuleSnapshot[]) => void;
    workshopDeleted: (workshopId: string) => void;
    workshopChanged: (workshopId: string, patch: AugmentedPatch) => void;
    allModulesUpdated: (moduleSnapshots: ModuleSnapshot[]) => void;
    moduleMapListUpdated: (moduleMapList: ModuleMapData[]) => void;
    moduleUpdated: (moduleSnapshot: ModuleSnapshot, workshopModulesList: string[]) => void;
    moduleDeleted: (moduleId: string, workshopModulesList: string[]) => void;
    moduleChanged: (moduleId: string, patch: AugmentedPatch) => void;
    allPlayableModulesUpdated: (playableModules: PlayableModule[]) => void;
    playableModuleUpdated: (playableModule: PlayableModule) => void;
    playableModuleDeleted: (moduleId: string) => void;
};

/* ------------------- */
/* -- MESSAGE TYPES -- */
/* ------------------- */

export type MapList = Array<{
    id: number;
    name: string;
    isOwnedByAModule: boolean;
}>;

export interface SocketIOError {
    type: string;
    message: string;
    translationKey: string;
    interpolationOptions: string;
}

export type UserList = MapEditingUser[];

export interface MapEditingUser {
    userId: number;
    username: string;
}

export type AssetVersion = string;

export interface ImageVersions {
    [tileImageUsage: number]: AssetVersion;
}

export interface TileAssetImageVersions {
    [id: string]: ImageVersions;
}

export interface ArrayBufferWithVersion {
    data: ArrayBuffer;
    version: AssetVersion;
}

export interface ChangeableTileDataSnapshotWithPosition {
    position: {
        x: number;
        y: number;
        layer: number;
    };
    newData: ChangeableTileDataSnapshot;
}

export interface NewAndOldChangeableTileDataSnapshotWithPosition extends ChangeableTileDataSnapshotWithPosition {
    previousData: ChangeableTileDataSnapshot;
}

export type LogLevel = "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

/* ------------- */
/* -- HELPERS -- */
/* ------------- */

export function errorToSocketIOError(error: any): SocketIOError {
    return {
        type: error.constructor.name,
        message: error.message,
        translationKey: error.translationKey,
        interpolationOptions: error.interpolationOptions
    };
}

export function createErrorFromSocketError(error: SocketIOError) {
    if (isErrorTranslated(error))
        return new TranslatedError(error.translationKey, error.interpolationOptions);

    return new TranslatedError("editor.untranslated_server_error", { error: `${error.type}: ${error.message}` });
}

export function isErrorTranslated(error: Error | SocketIOError) {
    return !!(error as any).translationKey;
}

/* -------------------- */
/* -- CLIENT HELPERS -- */
/* -------------------- */

export function throwIfErrorSet(socketIOError: SocketIOError) {
    if (!socketIOError)
        return;

    throw createErrorFromSocketError(socketIOError);
}

export function autoResolveRejectCallback(resolve: () => void, reject: (reason?: any) => void) {
    return (error: SocketIOError) => resolveRejectCallback(error, resolve, reject);
}

export function autoResolveRejectWithResultCallback<T>(resolve: (result: T) => void, reject: (error: any) => void, error: SocketIOError, result: T) {
    if (error) reject(createErrorFromSocketError(error));
    else resolve(result);
}

export function resolveRejectCallback(error: SocketIOError, resolve: () => void, reject: (reason?: any) => void) {
    try {
        throwIfErrorSet(error);
        resolve();
    } catch (e) {
        reject(e);
    }
}
