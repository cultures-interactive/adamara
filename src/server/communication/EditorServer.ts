import { Socket } from "socket.io";
import { ServerState } from "../data/ServerState";
import { ClientSession } from "../data/ClientSession";
import { ServerBase, SocketIOServer } from "./ServerBase";
import { RequestHandler as ExpressRequestHandler } from "express";
import { MapList, UserList, EditorClientToServerEvents, EditorServerToClientEvents, ArrayBufferWithVersion, ChangeableTileDataSnapshotWithPosition } from "../../shared/definitions/socket.io/socketIODefinitions";
import { MapWithMetaData } from "../data/MapWithMetaData";
import { GameMap } from "../database/models/GameMap";
import { MapDataModel } from "../../shared/game/MapDataModel";
import { fromSnapshot, getSnapshot } from "mobx-keystone";
import { TranslatedError } from "../../shared/definitions/errors/TranslatedError";
import { TileAsset } from "../database/models/TileAsset";
import { ActionTree } from "../database/models/ActionTree";
import { AugmentedPatch, checkAndApplyAllPatchesOrThrow, checkAndApplyAsManyPatchesAsPossible, checkAndApplyPatchOrThrow, PatchCheckResult } from "../../shared/helper/mobXHelpers";
import { dataConstants } from "../../shared/data/dataConstants";
import { CombatConfigurationModel } from "../../shared/combat/CombatConfigurationModel";
import { objectContentsEqual } from "../../shared/helper/generalHelpers";
import { AnimationAsset } from "../database/models/AnimationAsset";
import { AnimationAssetModel } from "../../shared/resources/AnimationAssetModel";
import { CharacterConfiguration } from "../database/models/CharacterConfiguration";
import * as uuid from "uuid";
import { ActionTreeWithMetaData } from "../data/ActionTreeWithMetaData";
import { deleteEntity, unDeleteEntity, deleteEntityWithName, unDeleteEntityWithName, routeWrapperAsync, routeWrapper } from "./serverUtils";
import { ItemModel, ItemSnapshot } from "../../shared/game/ItemModel";
import { logger } from "../integrations/logging";
import { doesImageNeedTexture, ImageSnapshot, throwIfImageSizeIsTooBig } from "../../shared/resources/ImageModel";
import { Image } from "../database/models/Image";
import { Item } from "../database/models/Item";
import { wrapIterator } from "../../shared/helper/IterableIteratorWrapper";
import { tileDataEqualsChangeableTileDataSnapshot, getChangeableTileDataSnapshot } from "../../shared/game/TileDataModel";
import { CharacterConfigurationModel, CharacterConfigurationSnapshot } from "../../shared/resources/CharacterConfigurationModel";
import { GameDesignVariablesModel } from "../../shared/game/GameDesignVariablesModel";
import { patchedSave } from "../helper/sequelizeUtils";
import { loadTileAtlasImage } from "../optimization/atlasPacker";
import { Sentry } from "../integrations/sentry";
import { TileAssetSnapshot } from "../../shared/resources/TileAssetModel";
import { ModuleModel, ReadonlyEditorModule } from "../../shared/workshop/ModuleModel";
import { ActionTreeSnapshot, ActionTreeType } from "../../shared/action/ActionTreeModel";
import { sequelize } from "../database/db";
import { UserPrivileges } from "../../shared/definitions/apiResults/AuthCheckLoginStatusResult";
import { sendToSentryAndLogger } from "../integrations/errorReporting";
import { reportSocketIOConnect, reportSocketIODisconnect } from "../integrations/monitoring";
import { MapDataPropertiesModel } from "../../shared/game/MapDataPropertiesModel";
import { canModuleBePlayedInWorkshops } from "../helper/moduleHelpers";
import { MakeshiftTranslationSystemDataModel } from "../../shared/translation/MakeshiftTranslationSystemDataModel";

const getMapSocketRoom = (mapWithMetaData: MapWithMetaData) => "map_" + mapWithMetaData.mapId;
const getModuleSocketRoom = (moduleId: string) => "module_" + moduleId;

export class EditorServer extends ServerBase<EditorClientToServerEvents, EditorServerToClientEvents> {

    public constructor(
        protected serverState: ServerState,
        protected sessionMiddlewares: ExpressRequestHandler[],
        socketIOServer: SocketIOServer
    ) {
        super(sessionMiddlewares, socketIOServer);
    }

    public start() {
        super.init();

        this.io.on("connection", this.onConnection.bind(this));
        logger.info("EditorServer: socket.io server ready.");
    }

    private async onConnection(socket: Socket<EditorClientToServerEvents, EditorServerToClientEvents>): Promise<void> {
        const {
            forThisClient,
            forEveryone,
            forEveryoneElse,
            throwIfUserIsNotLoggedIn,
            availableOnlyToAdminUser,
            getLatestEventName
        } = super.connectSocket(socket);

        const username = socket.handshake.query.username as string;
        const adminModuleId = socket.handshake.query.adminModuleId as string;
        const playPublicModuleIdsString = socket.handshake.query?.playPublicModuleIds as string;
        const playPublicModuleIds = (playPublicModuleIdsString && playPublicModuleIdsString.length > 0)
            ? playPublicModuleIdsString.split(",")
            : undefined;

        const clientSession = new ClientSession(this.nextUserId, socket, username);
        this.nextUserId++;

        if (adminModuleId && socket.request.user) {
            const { privilegeLevel, workshopId } = socket.request.user;
            const module = this.serverState.getActiveModule(adminModuleId);
            if ((privilegeLevel === UserPrivileges.Admin) ||
                ((privilegeLevel === UserPrivileges.SingleWorkshopAdmin) && module && (module.snapshot.workshopId === workshopId))) {
                socket.request.user.moduleId = adminModuleId;
            }
        }

        const clientLogger = logger.child({
            messagePrefix: () => `Client ${clientSession.clientId} / ${socket.id} (${clientSession.username ? clientSession.username : "no username"}): `
        });

        const forEveryoneInSameDomain = () => {
            if (socket.request.user.moduleId)
                return this.io.to(getModuleSocketRoom(socket.request.user.moduleId));
            else
                return this.io;
        };

        const forEveryoneElseInSameDomain = () => {
            if (socket.request.user.moduleId)
                return socket.broadcast.to(getModuleSocketRoom(socket.request.user.moduleId));
            else
                return socket.broadcast;
        };

        const mapListWasUpdated = (mapWasDeleted: boolean) => {
            // On deletion, clients are already adjusting the map list client-side.
            // For all other cases, send a new map list.
            if (!mapWasDeleted) {
                const { moduleId } = socket.request.user;
                forEveryoneInSameDomain().emit("mapListUpdated", this.getCurrentMapList(moduleId));
            }
            this.serverState.emit("updatedMapList");
        };

        clientLogger.info("Connected");

        reportSocketIOConnect(clientSession.clientId);

        socket.on("disconnect", () => {
            reportSocketIODisconnect(clientSession.clientId);
            clientLogger.info("Disconnected");
            clientSession.dispose();
        });

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        socket.join(socket.id);

        const availableToEveryone = () => { };

        const availableToUserWithAnyEditRights = () => {
            throwIfUserIsNotLoggedIn();

            switch (socket.request.user.privilegeLevel) {
                case UserPrivileges.Admin:
                case UserPrivileges.SingleWorkshopAdmin:
                case UserPrivileges.WorkshopParticipant:
                    return;
            }

            Sentry.captureMessage(`[availableToUserWithAnyEditRights] User was not authorized to edit.`);
            throw new TranslatedError("editor.error_not_authorized");
        };

        const checkEditRights = (
            functionName: string,
            id: any,
            isModuleOwner: (moduleId: string) => boolean,
            noRightsToEditMessageKey: string
        ) => {
            throwIfUserIsNotLoggedIn();

            const { privilegeLevel } = socket.request.user;

            if (privilegeLevel === UserPrivileges.Admin)
                return;

            if ((privilegeLevel === UserPrivileges.SingleWorkshopAdmin) || (privilegeLevel === UserPrivileges.WorkshopParticipant)) {
                const { moduleId } = socket.request.user;
                const module = this.serverState.getActiveModule(moduleId);
                if (!moduleId || !module) {
                    Sentry.captureMessage(`[${functionName}] Couldn't load module "${moduleId}" for event: ${getLatestEventName()}`);
                    throw new TranslatedError("editor.error_fetching_user_module_from_server_state");
                }

                if (!isModuleOwner(moduleId)) {
                    Sentry.captureMessage(`[${functionName}] User was not authorized to edit "${id}": ${getLatestEventName()}`);
                    throw new TranslatedError(noRightsToEditMessageKey);
                }

                return;
            }

            if (privilegeLevel === UserPrivileges.WorkshopPlayer) {
                Sentry.captureMessage(`[${functionName}] User was not authorized to edit "${id}": ${getLatestEventName()}`);
                throw new TranslatedError(noRightsToEditMessageKey);
            }

            throw new Error("Not implemented");
        };

        const availableOnlyToUserWithMapEditRights = (mapId: number) => {
            checkEditRights(
                "availableOnlyToUserWithMapEditRights",
                mapId,
                (moduleId) => this.serverState.getMapById(mapId)?.moduleOwnerId === moduleId,
                /*t*/"editor.error_no_rights_to_edit_this_map"
            );
        };

        const availableOnlyToUserWithItemEditRights = (itemId: string) => {
            checkEditRights(
                "availableOnlyToUserWithItemEditRights",
                itemId,
                (moduleId) => this.serverState.items.get(itemId)?.snapshot.moduleOwner === moduleId,
                /*t*/"editor.error_no_rights_to_edit_this_item"
            );
        };

        const availableOnlyToUserWithImageEditRights = (imageId: number) => {
            checkEditRights(
                "availableOnlyToUserWithImageEditRights",
                imageId,
                (moduleId) => this.serverState.images.get(imageId)?.snapshot.moduleOwner === moduleId,
                /*t*/"editor.error_no_rights_to_edit_this_image"
            );
        };

        const availableOnlyToUserWithCharacterEditRights = (characterId: number) => {
            checkEditRights(
                "availableOnlyToUserWithCharacterEditRights",
                characterId,
                (moduleId) => this.serverState.characterConfigurations.get(characterId)?.snapshot.moduleOwner === moduleId,
                /*t*/"editor.error_no_rights_to_edit_this_character"
            );
        };

        const throwIfActionTreeRootIsNotModuleTreeRoot = (actionTreeWithMetadata: ActionTreeWithMetaData, moduleRootActionTreeId: string) => {
            let currentTree = actionTreeWithMetadata;

            do {
                if (currentTree.actionTreeSnapshot.type === ActionTreeType.ModuleRoot) {
                    if (moduleRootActionTreeId === currentTree.actionTreeSnapshot.$modelId)
                        return;

                    throw new TranslatedError("editor.error_no_rights_to_edit_this_tree");
                }

                if ((currentTree.actionTreeSnapshot.type === ActionTreeType.MainGameRoot) || (currentTree.actionTreeSnapshot.type === ActionTreeType.TemplateRoot))
                    throw new TranslatedError("editor.error_no_rights_to_edit_this_tree");

                currentTree = this.serverState.actionTreesWithMetadata.get(currentTree.actionTreeSnapshot.parentModelId);
            } while (currentTree);

            throw new TranslatedError("editor.error_could not find parent tree of the tree changed");
        };

        const availableOnlyToUserWithActionTreeChangeRights = (actionTreeModelIds: string[]) => {
            checkEditRights(
                "availableOnlyToUserWithCharacterEditRights",
                actionTreeModelIds,
                (moduleId) => {
                    const module = this.serverState.getActiveModule(moduleId);
                    const moduleRootActionTreeId = module.snapshot.actiontreeId;

                    for (const actionTreeModelId of actionTreeModelIds) {
                        const actionTreeWithMetadata = this.serverState.actionTreesWithMetadata.get(actionTreeModelId);
                        if (!actionTreeWithMetadata)
                            throw new TranslatedError("editor.error_action_tree_does_not_exist");

                        throwIfActionTreeRootIsNotModuleTreeRoot(actionTreeWithMetadata, moduleRootActionTreeId);
                    }

                    return true;
                },
                /*t*/"editor.error_no_rights_to_edit_this_tree"
            );
        };

        clientSession.on(ClientSession.EventJoinedMap,
            (mapWithMetaData: MapWithMetaData) => {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                socket.join(getMapSocketRoom(mapWithMetaData));
            }
        );

        clientSession.on(ClientSession.EventLeftMap,
            (mapWithMetaData: MapWithMetaData) => {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                socket.leave(getMapSocketRoom(mapWithMetaData));
            }
        );

        clientSession.on(ClientSession.EventCurrentMapUserListChanged,
            (userList: UserList) => {
                socket.emit("currentMapUserListUpdated", userList);
            }
        );

        const tileAssetSnapshotChunkSize = 500;

        const queuedInitializationData = {
            tileAssetSnapshots: null as Array<TileAssetSnapshot>,
            allActionTreesSnapshots: null as Array<ActionTreeSnapshot>
        };

        socket.on("startInitialization", routeWrapper(
            "startInitialization",
            availableToEveryone,
            (callback) => {
                const playAccesscode = socket.request.user?.playAccesscode;
                const standaloneModulePlayAccesscode = socket.request.user?.standaloneModulePlayAccesscode;
                const moduleId = socket.request.user?.moduleId;
                const privilegeLevel = socket.request.user?.privilegeLevel;

                if (moduleId) {
                    const module = this.serverState.getActiveModule(moduleId);
                    if (privilegeLevel === UserPrivileges.WorkshopParticipant && !module) {
                        throw new TranslatedError("editor.error_module_does_not_exist");
                    }
                }

                let relevantModuleIds: string[] = [];
                let standaloneModuleStartMapId: number = null;

                if (playPublicModuleIds) {
                    const foundModules = this.serverState.getActiveModulesFromList(playPublicModuleIds);
                    const standaloneModule = foundModules.find(module => module.snapshot.isStandalone);
                    if (standaloneModule) {
                        relevantModuleIds = [standaloneModule.id];
                        standaloneModuleStartMapId = standaloneModule.snapshot.standaloneMapId;
                    } else {
                        relevantModuleIds = foundModules.map(module => module.snapshot.$modelId);
                    }
                } else if (moduleId) {
                    relevantModuleIds = [moduleId];
                } else if (standaloneModulePlayAccesscode) {
                    const standaloneModule = this.serverState.getActiveModuleViaStandalonePlayAccessCode(standaloneModulePlayAccesscode);
                    if (!standaloneModule)
                        throw new TranslatedError("editor.error_module_does_not_exist");

                    relevantModuleIds = [standaloneModule.id];
                    standaloneModuleStartMapId = standaloneModule.snapshot.standaloneMapId;
                } else if (playAccesscode) {
                    const playWorkshop = this.serverState.getActiveWorkshopViaPlayAccessCode(playAccesscode);
                    if (!playWorkshop)
                        throw new TranslatedError("editor.error_workshop_does_not_exist");

                    relevantModuleIds = playWorkshop.snapshot.modulesToPlay.filter(module => canModuleBePlayedInWorkshops(this.serverState.getActiveModule(module)?.snapshot));
                }

                const actionTreeSnapshots = this.serverState.getRelevantActionTreeSnapshots(relevantModuleIds);

                const tileAssets = wrapIterator(this.serverState.tileAssets.values()).filter(t => !t.deleted);
                const animationAssets = wrapIterator(this.serverState.animationAssets.values()).filter(t => !t.deleted);
                const items = wrapIterator(this.serverState.items.values()).filter(t => !t.deleted);
                const images = wrapIterator(this.serverState.images.values()).filter(t => !t.deleted);
                const characterConfiguration = wrapIterator(this.serverState.characterConfigurations.values()).filter(c => !c.deleted);
                const tileAssetImageVersions = this.serverState.generateTileAssetVersions();
                const tileAtlasDataArray = this.serverState.pruneTileAtlasDataArray(tileAssetImageVersions);
                const { thumbnailCatalogue } = this.serverState;

                queuedInitializationData.tileAssetSnapshots = tileAssets.map(t => t.snapshot);
                const tileAssetSnapshotChunkCount = Math.ceil(queuedInitializationData.tileAssetSnapshots.length / tileAssetSnapshotChunkSize);
                queuedInitializationData.allActionTreesSnapshots = actionTreeSnapshots;

                let sessionModule: ReadonlyEditorModule = null;
                if (moduleId) {
                    const module = fromSnapshot<ModuleModel>(this.serverState.getActiveModule(moduleId).snapshot);
                    if (!module)
                        throw new TranslatedError("editor.error_module_does_not_exist");

                    const workshop = this.serverState.getActiveWorkshop(module.workshopId);
                    sessionModule = new ReadonlyEditorModule(module, workshop.snapshot.name);
                }

                const stepCount = 10;
                let currentStep = 1;

                forThisClient.emit("initializeClient",
                    clientSession.userId,
                    dataConstants.gitCommitSHA,
                    this.serverState.combatConfiguration.snapshot,
                    this.serverState.gameDesignVariables.snapshot,
                    this.serverState.makeshiftTranslationSystemData.snapshot,
                    sessionModule,
                    this.serverState.soundFiles
                );
                forThisClient.emit("setInitializationPercentage", currentStep++ / stepCount);

                forThisClient.emit("allTileAssetsUpdated", tileAssetSnapshotChunkCount, tileAssetImageVersions, tileAtlasDataArray, thumbnailCatalogue);
                forThisClient.emit("setInitializationPercentage", currentStep++ / stepCount);

                forThisClient.emit("allAnimationAssetsUpdated", animationAssets.map(t => t.snapshot));
                forThisClient.emit("setInitializationPercentage", currentStep++ / stepCount);

                forThisClient.emit("allActionTreesUpdated", queuedInitializationData.allActionTreesSnapshots.length);
                forThisClient.emit("setInitializationPercentage", currentStep++ / stepCount);

                forThisClient.emit("allCharacterConfigurationsUpdated", this.getCurrentResources(characterConfiguration, relevantModuleIds) as CharacterConfigurationModel[]);
                forThisClient.emit("setInitializationPercentage", currentStep++ / stepCount);

                forThisClient.emit("mapListUpdated", this.getCurrentMapList(moduleId));
                forThisClient.emit("setInitializationPercentage", currentStep++ / stepCount);

                forThisClient.emit("allItemsUpdated", this.getCurrentResources(items, relevantModuleIds) as ItemSnapshot[]);
                forThisClient.emit("setInitializationPercentage", currentStep++ / stepCount);

                forThisClient.emit("allImagesUpdated", this.getCurrentResources(images, relevantModuleIds) as ImageSnapshot[]);
                forThisClient.emit("setInitializationPercentage", currentStep++ / stepCount);

                forThisClient.emit("initializationFinished", standaloneModuleStartMapId);

                if (moduleId) {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    socket.join(getModuleSocketRoom(socket.request.user.moduleId));
                }

                callback(null);
            }
        ));

        socket.on("getNextAllTileAssetsUpdatedChunk", routeWrapper(
            "getNextAllTileAssetsUpdatedChunk",
            availableToEveryone,
            (callback) => {
                const chunk = queuedInitializationData.tileAssetSnapshots.splice(0, tileAssetSnapshotChunkSize);
                callback(null, chunk);
            }
        ));

        socket.on("getNextAllActionTreesUpdatedChunk", routeWrapper(
            "getNextAllActionTreesUpdatedChunk",
            availableToEveryone,
            (callback) => {
                const queuedSnapshots = queuedInitializationData.allActionTreesSnapshots;

                let maxActionsPerChunkLeft = 300; // About 0.5 MB

                const resultSnapshots = new Array<ActionTreeSnapshot>();
                do {
                    // If we already have at least one snapshot as a result, and we would be over our limit with this new one, don't queue it
                    maxActionsPerChunkLeft -= queuedSnapshots[0].nonSubTreeActions.length;
                    if ((resultSnapshots.length > 0) && (maxActionsPerChunkLeft < 0))
                        break;

                    // Move from queued -> result
                    resultSnapshots.push(queuedSnapshots.shift());
                } while (queuedSnapshots.length > 0);

                callback(null, resultSnapshots);
            }
        ));

        socket.on("updateTileAsset", routeWrapper(
            "updateTileAsset",
            availableOnlyToAdminUser,
            (tileAssetSnapshot, backgroundImageData, waterMaskImageData, foregroundImageData, waterMaskForegroundImageData, callback) => {
                const { tileAssets } = this.serverState;
                if (!tileAssets.has(tileAssetSnapshot.id)) {
                    tileAssets.set(tileAssetSnapshot.id, new TileAsset());
                }
                const tileAsset = tileAssets.get(tileAssetSnapshot.id);

                tileAsset.deleted = false;
                tileAsset.snapshot = tileAssetSnapshot;

                let backgroundImageDataWithVersion: ArrayBufferWithVersion;
                if (backgroundImageData) {
                    tileAsset.backgroundImageData = backgroundImageData;
                    tileAsset.backgroundImageDataVersion = uuid.v1();
                    backgroundImageDataWithVersion = {
                        data: backgroundImageData,
                        version: tileAsset.backgroundImageDataVersion
                    };
                }

                let waterMaskImageDataWithVersion: ArrayBufferWithVersion;
                if (waterMaskImageData) {
                    tileAsset.middleImageData = waterMaskImageData;
                    tileAsset.middleImageDataVersion = uuid.v1();
                    waterMaskImageDataWithVersion = {
                        data: waterMaskImageData,
                        version: tileAsset.middleImageDataVersion
                    };
                }

                let foregroundImageDataWithVersion: ArrayBufferWithVersion;
                if (foregroundImageData) {
                    tileAsset.foregroundImageData = foregroundImageData;
                    tileAsset.foregroundImageDataVersion = uuid.v1();
                    foregroundImageDataWithVersion = {
                        data: foregroundImageData,
                        version: tileAsset.foregroundImageDataVersion
                    };
                }

                let waterMaskForegroundImageDataWithVersion: ArrayBufferWithVersion;
                if (waterMaskForegroundImageData) {
                    tileAsset.waterMaskForegroundImageData = waterMaskForegroundImageData;
                    tileAsset.waterMaskForegroundImageDataVersion = uuid.v1();
                    waterMaskForegroundImageDataWithVersion = {
                        data: waterMaskForegroundImageData,
                        version: tileAsset.waterMaskForegroundImageDataVersion
                    };
                }

                forEveryoneElse.emit(
                    "tileAssetUpdated",
                    tileAssetSnapshot,
                    backgroundImageDataWithVersion,
                    waterMaskImageDataWithVersion,
                    foregroundImageDataWithVersion,
                    waterMaskForegroundImageDataWithVersion
                );

                callback(null);
            }
        ));

        socket.on("deleteTileAsset", routeWrapper(
            "deleteTileAsset",
            availableOnlyToAdminUser,
            (id, callback) => {
                const { tileAssets } = this.serverState;
                const tileAsset = tileAssets.get(id);
                if (tileAsset) {
                    tileAsset.deleted = true;
                }
                forEveryoneElse.emit("tileAssetDeleted", id);
                callback(null);
            }
        ));

        socket.on("getTileAssetImage", routeWrapper(
            "getTileAssetImage",
            availableToEveryone,
            (id, usage, callback) => {
                const { tileAssets } = this.serverState;
                const tileAsset = tileAssets.get(id);
                if (!tileAsset || tileAsset.deleted)
                    throw new Error("Tile asset " + id + " doesn't exist");

                const data = tileAsset.getImageData(usage);
                const version = tileAsset.getImageDataVersion(usage);

                callback(null, { data, version });
            }
        ));

        socket.on("getTileAssetImageAtlasImage", routeWrapperAsync(
            "getTileAssetImageAtlasImage",
            availableToEveryone,
            async (atlasImageName, callback) => {
                const image = await loadTileAtlasImage(atlasImageName);
                callback(null, image);
            }
        ));

        socket.on("createCharacterConfiguration", routeWrapperAsync(
            "createCharacterConfiguration",
            availableToUserWithAnyEditRights,
            async (snapshot, callback) => {
                if (!snapshot) throw new Error("CharacterConfiguration snapshot parameter is null.");
                if (!this.serverState.hasAnimationAssetWithName(snapshot.animationAssetName)) throw new Error("CharacterConfiguration references a non existing animation.");
                const characterConfiguration = await CharacterConfiguration.persist(snapshot);
                this.serverState.characterConfigurations.set(characterConfiguration.id, characterConfiguration);
                forEveryoneElseInSameDomain().emit("characterConfigurationCreated", snapshot);
                callback(null, snapshot);
            }
        ));

        socket.on("submitCharacterConfigurationChanges", routeWrapper(
            "submitCharacterConfigurationChanges",
            availableOnlyToUserWithCharacterEditRights,
            (characterConfigurationId, patches, inversePatches, callback) => {
                const serverStateCharConfig = this.serverState.characterConfigurations.get(characterConfigurationId);
                if (!serverStateCharConfig || serverStateCharConfig.deleted) throw new TranslatedError("editor.error_server_entity_not_found", {
                    type: CharacterConfiguration.name,
                    id: characterConfigurationId
                });
                const charConfig = fromSnapshot<CharacterConfigurationModel>(serverStateCharConfig.snapshot);
                checkAndApplyAllPatchesOrThrow(charConfig, patches, inversePatches, /*t*/"editor.error_generic_change_submitted_conflict");
                serverStateCharConfig.snapshot = getSnapshot(charConfig);
                forEveryoneElseInSameDomain().emit("characterConfigurationChanged", characterConfigurationId, patches);
                callback(null);
            }
        ));

        socket.on("deleteCharacterConfiguration", routeWrapperAsync(
            "deleteCharacterConfiguration",
            availableOnlyToUserWithCharacterEditRights,
            async (characterConfigurationId, callback) => {
                const characterConfiguration = await deleteEntity<CharacterConfiguration>(this.serverState.characterConfigurations.get(characterConfigurationId));
                forEveryoneInSameDomain().emit("characterConfigurationDeleted", characterConfiguration.id);
                callback(null);
            }
        ));

        socket.on("unDeleteCharacterConfiguration", routeWrapperAsync(
            "unDeleteCharacterConfiguration",
            availableOnlyToUserWithCharacterEditRights,
            async (characterConfigurationId, callback) => {
                const characterConfig = await unDeleteEntity(this.serverState.characterConfigurations.get(characterConfigurationId));
                forEveryoneElseInSameDomain().emit("characterConfigurationUnDeleted", characterConfig.snapshot);
                callback(null, characterConfig.snapshot);
            }
        ));

        socket.on("createAnimationAsset", routeWrapperAsync(
            "createAnimationAsset",
            availableOnlyToAdminUser,
            async (snapshot, skeletonData, imageData, atlasData, callback) => {
                if (!snapshot) {
                    throw new Error("AnimationAsset snapshot parameter is null.");
                }
                if (!snapshot.name || snapshot.name.length < dataConstants.animationAssetNameLengthMin
                    || snapshot.name.length > dataConstants.animationAssetNameLengthMax) {
                    throw new Error("AnimationAsset has wrong length.");
                }
                if (this.serverState.hasAnimationAssetWithName(snapshot.name)) {
                    throw new Error("The name of AnimationAsset is already used. It must be unique.");
                }
                if (!dataConstants.animationAssetValidNameRegExp.test(snapshot.name)) {
                    throw new Error("AnimationAsset is invalid.");
                }
                if (snapshot.id) {
                    throw new Error("AnimationAsset id can not be set by the client.");
                }
                if (!skeletonData || !imageData || !atlasData) {
                    throw new Error("AnimationAsset data missing.");
                }
                if (skeletonData.byteLength + imageData.byteLength + atlasData.byteLength > dataConstants.animationAssetMaxSizeBytes) {
                    throw new Error("AnimationAsset data is too big.");
                }

                const animationAsset = await AnimationAsset.persist(snapshot, skeletonData, imageData, atlasData);
                this.serverState.animationAssets.set(animationAsset.id, animationAsset);
                forEveryoneElse.emit("animationAssetCreated", snapshot);
                callback(null, snapshot);
            }
        ));

        socket.on("submitAnimationChanges", routeWrapperAsync(
            "submitAnimationChanges",
            availableOnlyToAdminUser,
            async (id, patches, inversePatches, callback) => {
                const animationAsset = this.serverState.animationAssets.get(id);

                if (!animationAsset || animationAsset.deleted) {
                    throw new TranslatedError("editor.error_animation_asset_change_submitted_but_animation_does_not_exist");
                }

                const snapshot = animationAsset.snapshot;
                const animationAssetData = fromSnapshot<AnimationAssetModel>(snapshot);

                checkAndApplyAllPatchesOrThrow(animationAssetData, patches, inversePatches, /*t*/"editor.error_generic_change_submitted_conflict");
                animationAsset.snapshot = getSnapshot(animationAssetData);

                forEveryoneElse.emit("animationAssetChanged", id, patches);

                await patchedSave(animationAsset);

                callback(null);
            }
        ));

        socket.on("deleteAnimationAsset", routeWrapperAsync(
            "deleteAnimationAsset",
            availableOnlyToAdminUser,
            async (id, callback) => {
                const animationAsset = await deleteEntityWithName<AnimationAsset>(this.serverState.animationAssets.get(id));
                forEveryone.emit("animationAssetDeleted", animationAsset.id);
                callback(null);
            }
        ));

        socket.on("unDeleteAnimationAsset", routeWrapperAsync(
            "unDeleteAnimationAsset",
            availableOnlyToAdminUser,
            async (id, callback) => {
                const animationAsset = await unDeleteEntityWithName(this.serverState.animationAssets.get(id));
                forEveryoneElse.emit("animationAssetUnDeleted", animationAsset.snapshot);
                callback(null, animationAsset.snapshot);
            }
        ));

        socket.on("createNewMap", routeWrapperAsync(
            "createNewMap",
            availableToUserWithAnyEditRights,
            async (mapName, callback) => {
                const { moduleId } = socket.request.user;

                const newMapData = new MapDataModel({
                    tiles: [],
                    properties: new MapDataPropertiesModel({
                        name: mapName,
                    }),
                    moduleOwner: moduleId
                });

                const newMapDataSnapshot = getSnapshot(newMapData);

                const newGameMap = await GameMap.create({
                    snapshotJSONString: JSON.stringify(newMapDataSnapshot)
                });

                const newMapWithMetaData = this.serverState.createAndAddMapWithMetaData(newGameMap);

                mapListWasUpdated(false);

                callback(null, newMapWithMetaData.mapId, newMapWithMetaData.mapSnapshot);
            }
        ));

        socket.on("loadMap", routeWrapperAsync(
            "loadMap",
            availableToUserWithAnyEditRights,
            async (id, callback) => {
                const mapWithMetaData = this.serverState.getMapById(id);
                if (!mapWithMetaData)
                    throw new Error("Map doesn't exist");

                const { mapSnapshot } = mapWithMetaData;
                callback(null, mapSnapshot);
            }
        ));

        socket.on("setCurrentMap", routeWrapper(
            "setCurrentMap",
            availableToUserWithAnyEditRights,
            (id, callback) => {
                const mapWithMetaData = this.serverState.getMapById(id);
                if (!mapWithMetaData)
                    throw new Error("Map doesn't exist");

                clientSession.currentMap = mapWithMetaData;

                const userList = mapWithMetaData.userList;
                callback(null, userList);
            }
        ));

        socket.on("closeCurrentMap", routeWrapper(
            "closeCurrentMap",
            availableToUserWithAnyEditRights,
            (callback) => {
                clientSession.currentMap = null;
                callback(null);
            }
        ));

        socket.on("deleteMap", routeWrapperAsync(
            "deleteMap",
            availableOnlyToUserWithMapEditRights,
            async (id, callback) => {
                const gameMapWithMetaData = this.serverState.getMapById(id);
                if (!gameMapWithMetaData)
                    throw new Error("Couldn't find map with id# " + id);

                // Set deleted and start saving the map before calling dispose() on in in removeAndDisposeMapWithMetaData()
                gameMapWithMetaData.deleted = true;
                const saveMapPromise = gameMapWithMetaData.saveGameMap();

                this.serverState.removeAndDisposeMapWithMetaData(gameMapWithMetaData);
                forThisClient.emit("mapDeleted", id, true);
                forEveryoneElseInSameDomain().emit("mapDeleted", id, false);

                // Disconnect all connected client sessions from this map
                while (gameMapWithMetaData.connectedClientSessions.length > 0) {
                    gameMapWithMetaData.connectedClientSessions[0].currentMap = null;
                }

                await saveMapPromise;

                mapListWasUpdated(true);

                callback(null);
            }
        ));

        socket.on("undeleteMap", routeWrapperAsync(
            "undeleteMap",
            availableOnlyToUserWithMapEditRights,
            async (id, callback) => {
                const gameMap = await GameMap.findOne({
                    where: {
                        id,
                        deleted: true
                    }
                });

                gameMap.deleted = false;
                await patchedSave(gameMap);

                this.serverState.createAndAddMapWithMetaData(gameMap);
                this.serverState.sortMaps();

                mapListWasUpdated(false);

                callback(null);
            }
        ));

        socket.on("setUsername", routeWrapper(
            "setUsername",
            availableToEveryone,
            (username, callback) => {
                clientSession.username = username;
                callback(null);
            }
        ));

        socket.on("submitDynamicMapElementsChanges", routeWrapper(
            "submitDynamicMapElementsChanges",
            availableOnlyToUserWithMapEditRights,
            (mapId, patches, inversePatches, callback) => {
                const mapWithMetaData = this.serverState.getMapById(mapId);
                if (!mapWithMetaData)
                    throw new Error("Couldn't find map with id# " + mapId);

                const { mapData } = mapWithMetaData;

                checkAndApplyAllPatchesOrThrow(mapData.dynamicMapElements, patches, inversePatches, /*t*/"editor.error_generic_change_submitted_conflict");

                forEveryoneElseInSameDomain().emit("mapDynamicMapElementsChanged", mapId, patches);

                callback(null);
            }
        ));

        socket.on("submitCurrentMapPropertyChanges", routeWrapper(
            "submitCurrentMapPropertyChanges",
            availableOnlyToUserWithMapEditRights,
            (mapId, patch, inversePatch, callback) => {
                const mapWithMetaData = this.serverState.getMapById(mapId);
                if (!mapWithMetaData)
                    throw new Error("Couldn't find map with id# " + mapId);

                const { mapData } = mapWithMetaData;

                checkAndApplyPatchOrThrow(mapData.properties, patch, inversePatch, /*t*/"editor.error_generic_change_submitted_conflict");

                forEveryoneElseInSameDomain().emit("mapPropertiesChanged", mapId, patch);

                if ((patch.path[0] === "name") || (patch.path[0] === "sortingPriority")) {
                    mapListWasUpdated(false);
                }

                callback(null);
            }
        ));

        socket.on("setTiles", routeWrapper(
            "setTiles",
            availableOnlyToUserWithMapEditRights,
            (mapId, tiles, plane, callback) => {
                const mapWithMetaData = this.serverState.getMapById(mapId);
                if (!mapWithMetaData)
                    throw new Error("Couldn't find map with id# " + mapId);

                const { mapData } = mapWithMetaData;

                for (const tile of tiles) {
                    const { position: { x, y, layer }, previousData } = tile;
                    const currentTileData = mapData.getTile(x, y, layer, plane);
                    if (!tileDataEqualsChangeableTileDataSnapshot(currentTileData, previousData)) {
                        // Push actual tile state to clear what has been set optimistically on the client already
                        const actualTiles: ChangeableTileDataSnapshotWithPosition[] = tiles.map(t => ({
                            newData: getChangeableTileDataSnapshot(mapData.getTile(t.position.x, t.position.y, layer, plane)),
                            position: {
                                x: t.position.x,
                                y: t.position.y,
                                layer: t.position.layer
                            }
                        }));
                        forThisClient.emit("tilesUpdated", mapId, actualTiles, plane);

                        throw new TranslatedError("editor.error_set_tiles_unexpected_current_value");
                    }
                }

                for (const tile of tiles) {
                    const { position: { x, y, layer }, newData } = tile;
                    mapData.setTile(x, y, layer, plane, newData);
                }

                forEveryoneElseInSameDomain().emit("tilesUpdated", mapId, tiles, plane);

                callback(null);
            }
        ));

        socket.on("submitCombatConfigurationChanges", routeWrapper(
            "submitCombatConfigurationChanges",
            availableOnlyToAdminUser,
            (patches, inversePatches, callback) => {
                const combatConfigurationInstance = fromSnapshot<CombatConfigurationModel>(this.serverState.combatConfiguration.snapshot);

                checkAndApplyAllPatchesOrThrow(combatConfigurationInstance, patches, inversePatches, /*t*/"editor.error_generic_change_submitted_conflict");

                this.serverState.combatConfiguration.snapshot = getSnapshot(combatConfigurationInstance);

                forEveryoneElse.emit("combatConfigurationChanged", patches);

                callback(null);
            }
        ));

        socket.on("submitGameDesignVariablesChanges", routeWrapper(
            "submitGameDesignVariablesChanges",
            availableOnlyToAdminUser,
            (patch, inversePatch, callback) => {
                const gameDesignVariablesInstance = fromSnapshot<GameDesignVariablesModel>(this.serverState.gameDesignVariables.snapshot);

                checkAndApplyPatchOrThrow(gameDesignVariablesInstance, patch, inversePatch, /*t*/"editor.error_generic_change_submitted_conflict");

                this.serverState.gameDesignVariables.snapshot = getSnapshot(gameDesignVariablesInstance);

                forEveryoneElse.emit("gameDesignVariablesChanged", patch);

                callback(null);
            }
        ));

        socket.on("submitMakeshiftTranslationSystemDataChanges", routeWrapper(
            "submitMakeshiftTranslationSystemDataChanges",
            availableOnlyToAdminUser,
            (patch, inversePatch, callback) => {
                const MakeshiftTranslationSystemDataInstance = fromSnapshot<MakeshiftTranslationSystemDataModel>(this.serverState.makeshiftTranslationSystemData.snapshot);

                checkAndApplyPatchOrThrow(MakeshiftTranslationSystemDataInstance, patch, inversePatch, /*t*/"editor.error_generic_change_submitted_conflict");

                this.serverState.makeshiftTranslationSystemData.snapshot = getSnapshot(MakeshiftTranslationSystemDataInstance);

                forEveryoneElse.emit("MakeshiftTranslationSystemDataChanged", patch);

                callback(null);
            }
        ));

        socket.on("createActionTrees", routeWrapperAsync(
            "createActionTrees",
            availableToUserWithAnyEditRights,
            async (newActionTreeSnapshots, callback) => {
                const { actionTreesWithMetadata: actionTrees } = this.serverState;

                const newActionTrees = new Array<ActionTreeWithMetaData>();

                await sequelize.transaction(async transaction => {
                    for (const newActionTreeSnapshot of newActionTreeSnapshots) {
                        const newActionTree = await ActionTree.create({
                            snapshotJSONString: JSON.stringify(newActionTreeSnapshot),
                            id: newActionTreeSnapshot.$modelId,
                            deleted: false
                        }, {
                            transaction
                        });

                        newActionTrees.push(new ActionTreeWithMetaData(newActionTree));
                    }
                });

                for (const newActionTree of newActionTrees) {
                    actionTrees.set(newActionTree.actionTreeSnapshot.$modelId, newActionTree);
                }

                forEveryoneElseInSameDomain().emit("actionTreesCreated", newActionTreeSnapshots);

                callback(null);
            }
        ));

        socket.on("deleteActionTrees", routeWrapper(
            "deleteActionTrees",
            (actionTreeSnapshots) => availableOnlyToUserWithActionTreeChangeRights(actionTreeSnapshots.map(snapshot => snapshot.$modelId)),
            (actionTreeSnapshots, callback) => {
                for (const snapshot of actionTreeSnapshots) {
                    const actionTreeWithMetadata = this.serverState.actionTreesWithMetadata.get(snapshot.$modelId);
                    if (!actionTreeWithMetadata)
                        throw new TranslatedError("editor.error_action_tree_does_not_exist");

                    if (actionTreeWithMetadata.actionTree.deleted)
                        throw new TranslatedError("editor.error_action_tree_already_deleted");

                    const { type } = actionTreeWithMetadata.actionTreeSnapshot;
                    if ((type === ActionTreeType.MainGameRoot) || (type === ActionTreeType.ModuleRoot))
                        throw new TranslatedError("editor.error_action_tree_deletion_cannot_delete_root");

                    if (!objectContentsEqual(actionTreeWithMetadata.actionTreeSnapshot, snapshot))
                        throw new TranslatedError("editor.error_action_tree_deletion_action_tree_was_changed");
                }

                const deletedModelIds = new Array<string>();

                for (const snapshot of actionTreeSnapshots) {
                    const actionTreeWithMetadata = this.serverState.actionTreesWithMetadata.get(snapshot.$modelId);
                    actionTreeWithMetadata.actionTree.deleted = true;
                    deletedModelIds.push(snapshot.$modelId);
                }

                forEveryoneInSameDomain().emit("actionTreesDeleted", deletedModelIds);

                callback(null);
            }
        ));

        socket.on("undeleteActionTrees", routeWrapper(
            "undeleteActionTrees",
            (actionTreeModelIds) => availableOnlyToUserWithActionTreeChangeRights(actionTreeModelIds),
            (actionTreeModelIds, callback) => {
                for (const id of actionTreeModelIds) {
                    const actionTreeWithMetadata = this.serverState.actionTreesWithMetadata.get(id);
                    if (!actionTreeWithMetadata)
                        throw new TranslatedError("editor.error_action_tree_does_not_exist");

                    if (!actionTreeWithMetadata.actionTree.deleted)
                        throw new TranslatedError("editor.error_action_tree_already_undeleted");

                    const { type } = actionTreeWithMetadata.actionTreeSnapshot;
                    if ((type === ActionTreeType.MainGameRoot) || (type === ActionTreeType.ModuleRoot))
                        throw new Error("Root action trees cannot be deleted, and therefore should never be able to be undeleted.");
                }

                const newSnapshots = new Array<ActionTreeSnapshot>();
                for (const id of actionTreeModelIds) {
                    const actionTreeWithMetadata = this.serverState.actionTreesWithMetadata.get(id);
                    actionTreeWithMetadata.actionTree.deleted = false;
                    newSnapshots.push(actionTreeWithMetadata.actionTreeSnapshot);
                }

                forEveryoneInSameDomain().emit("actionTreesCreated", newSnapshots);

                callback(null);
            }
        ));

        socket.on("submitActionTreeChanges", routeWrapper(
            "submitActionTreeChanges",
            (actionTreeModelId) => availableOnlyToUserWithActionTreeChangeRights([actionTreeModelId]),
            (actionTreeModelId, patches, inversePatches, executeAsManyAsPossible, callback) => {
                const actionTreeWithMetadata = this.serverState.actionTreesWithMetadata.get(actionTreeModelId);
                if (!actionTreeWithMetadata)
                    throw new TranslatedError("editor.error_action_tree_does_not_exist");

                const data = actionTreeWithMetadata.actionTreeModel;

                if (executeAsManyAsPossible) {
                    const patchResultsForExecuteAsManyAsPossible = checkAndApplyAsManyPatchesAsPossible(data, patches, inversePatches);

                    const successfulPatches = new Array<AugmentedPatch>();
                    for (let i = 0; i < patches.length; i++) {
                        if (patchResultsForExecuteAsManyAsPossible[i] === PatchCheckResult.Success) {
                            successfulPatches.push(patches[i]);
                        }
                    }

                    if (successfulPatches.length > 0) {
                        forEveryoneElseInSameDomain().emit("actionTreeChanged", actionTreeModelId, successfulPatches);
                    }

                    callback(null, patchResultsForExecuteAsManyAsPossible);
                } else {
                    checkAndApplyAllPatchesOrThrow(data, patches, inversePatches, /*t*/"editor.error_action_tree_change_submitted_conflict");
                    forEveryoneElseInSameDomain().emit("actionTreeChanged", actionTreeModelId, patches);
                    callback(null, null);
                }
            }
        ));

        socket.on("createItem", routeWrapper(
            "createItem",
            availableToUserWithAnyEditRights,
            (itemSnapshot: ItemSnapshot, callback) => {
                if (this.serverState.items.has(itemSnapshot.id))
                    throw new TranslatedError("editor.item_id_already_exists", { suggestion: itemSnapshot.id + "2" });

                this.serverState.addItemViaSnapshot(itemSnapshot);

                forEveryoneElseInSameDomain().emit("itemUpdated", itemSnapshot);
                callback(null);
            }
        ));

        socket.on("deleteItem", routeWrapper(
            "deleteItem",
            availableOnlyToUserWithItemEditRights,
            (itemId: string, callback) => {
                const serverItem = this.serverState.items.get(itemId);

                if (!serverItem) {
                    throw new TranslatedError("editor.error_item_does_not_exist");
                }
                if (serverItem.deleted) {
                    throw new TranslatedError("editor.error_item_is_already_deleted");
                }
                serverItem.deleted = true;

                forEveryoneElseInSameDomain().emit("itemDeleted", itemId);
                callback(null);
            }
        ));

        socket.on("unDeleteItem", routeWrapper(
            "unDeleteItem",
            availableOnlyToUserWithItemEditRights,
            (itemId: string, callback) => {
                const serverItem = this.serverState.items.get(itemId);

                if (!serverItem) {
                    throw new TranslatedError("editor.error_item_does_not_exist");
                }
                if (!serverItem.deleted) {
                    throw new TranslatedError("editor.error_item_is_not_deleted");
                }
                serverItem.deleted = false;

                forEveryoneInSameDomain().emit("itemUpdated", serverItem.snapshot);
                callback(null);
            }
        ));

        socket.on("submitItemChanges", routeWrapper(
            "submitItemChanges",
            availableOnlyToUserWithItemEditRights,
            (itemId, patch, inversePatch, callback) => {
                const serverItem = this.serverState.items.get(itemId);

                if (!serverItem || serverItem.deleted) {
                    throw new TranslatedError("editor.error_item_change_submitted_but_item_does_not_exist");
                }

                const snapshot = serverItem.snapshot;
                const item = fromSnapshot<ItemModel>(snapshot);

                checkAndApplyPatchOrThrow(item, patch, inversePatch, /*t*/"editor.error_generic_change_submitted_conflict");
                serverItem.snapshot = getSnapshot(item);

                forEveryoneElseInSameDomain().emit("itemChanged", itemId, patch);
                callback(null);
            }
        ));

        socket.on("createImage", routeWrapperAsync(
            "createImage",
            availableToUserWithAnyEditRights,
            async (clientSnapshot: ImageSnapshot, imageData: ArrayBuffer, callback) => {
                if (!clientSnapshot) {
                    throw new Error("Image snapshot parameter was not set");
                }
                if (clientSnapshot.id) {
                    throw new Error("Image snapshot must not have id set by client.");
                }
                if (!imageData) {
                    throw new Error("Image data missing.");
                }

                throwIfImageSizeIsTooBig(clientSnapshot.usecase, imageData.byteLength);

                const { moduleId } = socket.request.user;
                if (moduleId) {
                    clientSnapshot.moduleOwner = moduleId;
                }

                const image = await Image.persist(clientSnapshot, imageData);
                this.serverState.images.set(image.id, image);

                const imageSnapshot = image.snapshot;
                if (doesImageNeedTexture(imageSnapshot))
                    forEveryoneElseInSameDomain().emit("imageCreated", imageSnapshot, imageData);
                else
                    forEveryoneElseInSameDomain().emit("imageCreated", imageSnapshot, null);

                callback(null, image.snapshot);
            }
        ));

        socket.on("deleteImage", routeWrapper(
            "deleteImage",
            availableOnlyToUserWithImageEditRights,
            (imageId, callback) => {
                const serverImage = this.serverState.images.get(imageId);
                if (!serverImage) {
                    throw new TranslatedError("editor.error_image_does_not_exist");
                }
                if (serverImage.deleted) {
                    throw new TranslatedError("editor.error_image_already_deleted");
                }
                this.serverState.images.get(imageId).deleted = true;

                forEveryoneElseInSameDomain().emit("imageDeleted", imageId);
                callback(null);
            }
        ));

        socket.on("undeleteImage", routeWrapper(
            "undeleteImage",
            availableOnlyToUserWithImageEditRights,
            (imageId, callback) => {
                const serverImage = this.serverState.images.get(imageId);
                if (!serverImage) {
                    throw new TranslatedError("editor.error_image_does_not_exist");
                }
                if (!serverImage.deleted) {
                    throw new TranslatedError("editor.error_image_is_not_deleted");
                }
                this.serverState.images.get(imageId).deleted = false;
                const image = this.serverState.images.get(imageId);

                const imageSnapshot = image.snapshot;
                if (doesImageNeedTexture(imageSnapshot))
                    forEveryoneInSameDomain().emit("imageCreated", imageSnapshot, image.imageData);
                else
                    forEveryoneInSameDomain().emit("imageCreated", imageSnapshot, null);

                callback(null);
            }
        ));

        socket.on("log", (logLevel, message, meta) => {
            try {
                clientLogger.log(logLevel, `=> ${message}`, meta);
            } catch (e) {
                sendToSentryAndLogger(e);
            }
        });
    }

    private getCurrentMapList(moduleId: string): MapList {
        let module = undefined;
        if (moduleId) {
            module = this.serverState.getActiveModule(moduleId);
            if (!module) {
                throw new TranslatedError("editor.error_module_does_not_exist");
            }
        }
        const isStandaloneModule = module?.snapshot.isStandalone;
        const completeMapList = this.serverState.mapsWithMetaData.sort((a, b) => {
            const aPrio = a.mapSnapshot.properties.sortingPriority;
            const bPrio = b.mapSnapshot.properties.sortingPriority;

            if (aPrio !== bPrio)
                return aPrio - bPrio;

            return a.mapId - b.mapId;
        }).reduce((mapList, map) => {
            if (
                // All maps are relevant when we're not looking for a specific module.
                !moduleId ||
                // When we're looking for a specific module, maps owned by it are relevant.
                map.isOwnedByModule(moduleId) ||
                // When we're looking for a specific non-standalone-module, main game maps
                // are relevant if they contain interaction gates.
                (!isStandaloneModule && map.isMainGameMap && map.containsInteractionGates)
            ) {
                mapList.push({
                    id: map.mapId,
                    name: map.mapSnapshot.properties.name,
                    isOwnedByAModule: !!map.moduleOwnerId
                });
            }
            return mapList;
        }, [] as MapList);

        return completeMapList;
    }

    private getCurrentResources<T extends Item | Image | CharacterConfiguration>(resource: T[], relevantModuleIds: string[]): Array<ItemSnapshot | ImageSnapshot | CharacterConfigurationSnapshot> {
        const moduleIds = new Set(relevantModuleIds);
        return resource.map(t => t.snapshot).filter(s => !s.moduleOwner || moduleIds.has(s.moduleOwner));
    }
}

