import { autorun, IReactionDisposer, runInAction } from "mobx";
import { fromSnapshot, getSnapshot } from "mobx-keystone";
import { io } from "socket.io-client";
import { ActionTreeModel, ActionTreeSnapshot } from "../../shared/action/ActionTreeModel";
import { TranslatedError } from "../../shared/definitions/errors/TranslatedError";
import { autoResolveRejectCallback, throwIfErrorSet, ArrayBufferWithVersion, NewAndOldChangeableTileDataSnapshotWithPosition, resolveRejectCallback, autoResolveRejectWithResultCallback, LogLevel, EditorServerToClientEvents, EditorClientToServerEvents } from "../../shared/definitions/socket.io/socketIODefinitions";
import { MapDataModel } from "../../shared/game/MapDataModel";
import { AugmentedPatch, PatchCheckResult } from "../../shared/helper/mobXHelpers";
import { TileImageUsage, TileAssetModel, TileAssetSnapshot } from "../../shared/resources/TileAssetModel";
import { saveInTileImageCache } from "../cache/TileImageCache";
import { ErrorType } from "../stores/editor/ErrorNotification";
import { editorStore } from "../stores/EditorStore";
import { undoableActionEditorSubmitChanges } from "../stores/undo/operation/ActionEditorSubmitChangesOp";
import { undoableCombatConfigurationSubmitChanges } from "../stores/undo/operation/CombatConfigurationSubmitChangesOp";
import { undoStore } from "../stores/undo/UndoStore";
import { PatchTracker } from "./editorClient/PatchTracker";
import { ItemModel } from "../../shared/game/ItemModel";
import { AnimationAssetModel, AnimationAssetSnapshot, AnimationType } from "../../shared/resources/AnimationAssetModel";
import { CharacterConfigurationModel, CharacterConfigurationSnapshot } from "../../shared/resources/CharacterConfigurationModel";
import { undoableItemEditorSubmitItemChanges } from "../stores/undo/operation/ItemEditorSubmitItemPropertyChangesOp";
import { ImageSnapshot } from "../../shared/resources/ImageModel";
import { serializeError } from "serialize-error";
import { tileDataEqualsChangeableTileDataSnapshot } from "../../shared/game/TileDataModel";
import { CombatConfigurationModel } from "../../shared/combat/CombatConfigurationModel";
import { editorMapStore, MapStatus } from "../stores/EditorMapStore";
import { animationLoader, LocalCacheLoadingResult } from "../helper/AnimationLoader";
import { undoableCharacterEditorSubmitCharacterConfigurationsChanges } from "../stores/undo/operation/CharacterEditorSubmitCharacterConfigurationChangesOp";
import { tileImageLoader } from "./TileImageLoader";
import { GameDesignVariablesModel } from "../../shared/game/GameDesignVariablesModel";
import { undoableGameDesignVariablesSubmitChanges } from "../stores/undo/operation/GameDesignVariablesSubmitChangesOp";
import { isMainGameRoute, isPublicGameVariantRoute, queryParameterPlayPublicModuleIds } from "../data/routes";
import { getURLParameterNumber, getURLParameterString } from "../helper/generalHelpers";
import { actionEditorStore } from "../stores/ActionEditorStore";
import { charEditorStore } from "../stores/CharacterEditorStore";
import { combatEditorStore } from "../stores/CombatEditorStore";
import { combatStore } from "../stores/CombatStore";
import { gameStore } from "../stores/GameStore";
import { imageStore } from "../stores/ImageStore";
import { itemStore } from "../stores/ItemStore";
import { selectorMapEditorStore, mainMapEditorStore, mapEditorStores } from "../stores/MapEditorStore";
import { sharedStore } from "../stores/SharedStore";
import { tileAssetEditorStore } from "../stores/TileAssetEditorStore";
import { tileImageStore } from "../stores/TileImageStore";
import { errorStore } from "../stores/ErrorStore";
import { undoableAnimationEditorSubmitChanges } from "../stores/undo/operation/AnimationEditorSubmitChangesOp";
import { managementStore } from "../stores/ManagementStore";
import { userStore } from "../stores/UserStore";
import { SoundCache, soundCache } from "../stores/SoundCache";
import { ReactionDisposerGroup } from "../helper/ReactionDisposerGroup";
import { spawnAsyncWorkers } from "../helper/asyncHelpers";
import { clientId } from "../data/clientId";
import { localSettingsStore } from "../stores/LocalSettingsStore";
import { EditorComplexity } from "../../shared/definitions/other/EditorComplexity";
import { addErrorIfSet, ClientBase, DisconnectReason, executeWithErrorWrapper } from "./ClientBase";
import { Socket } from "socket.io-client";
import { animationThumbnailStore, characterThumbnailStore } from "../stores/GeneratedThumbnailStore";
import { animationEditorStore } from "../stores/AnimationSelectionStore";
import { wait } from "../../shared/helper/generalHelpers";
import { wrapIterator } from "../../shared/helper/IterableIteratorWrapper";
import { generatedImageCacheKey, GeneratedImageType, loadFromGeneratedImageCacheIfVersionMatchesElsePrune } from "../cache/GeneratedImageCache";
import { makeCharacterConfigurationThumbnailVersion } from "../helper/characterConfigurationHelpers";
import { animationCacheKey } from "../cache/AnimationCache";
import * as Sentry from "@sentry/react";
import { currentMapUserListStore } from "../stores/CurrentMapUserListStore";
import { CurrentMapStore } from "../stores/CurrentMapStore";
import { undoableMapEditorSubmitCurrentMapDynamicMapElementsChanges } from "../stores/undo/operation/MapEditorSubmitCurrentMapDynamicMapElementsChangesOp";
import { undoableMapEditorSubmitCurrentMapPropertyChanges } from "../stores/undo/operation/MapEditorSubmitCurrentMapPropertyChangesOp";
import { translationStore } from "../stores/TranslationStore";
import { MakeshiftTranslationSystemDataModel } from "../../shared/translation/MakeshiftTranslationSystemDataModel";
import { undoableMakeshiftTranslationSystemDataSubmitChanges } from "../stores/undo/operation/MakeshiftTranslationSystemDataSubmitChangesOp";

//const ConnectErrorMessageServerError = "server error";
//const ConnectErrorMessageXHRPollError = "xhr poll error";

interface HotReloadData {
    reloadMapIdOnReconnection: number;
}

class EditorClient extends ClientBase<EditorServerToClientEvents, EditorClientToServerEvents> {
    private reloadMapIdOnReconnection: number;
    private mapPatchTrackers: Map<number, PatchTracker[]>;
    private combatConfigurationPatchTracker: PatchTracker;
    private gameDesignVariablesPatchTracker: PatchTracker;
    private makeshiftTranslationSystemDataPatchTracker: PatchTracker;
    private actionTreePatchTrackersByModelId: Map<string, PatchTracker>;
    private animationPatchTracker: PatchTracker;
    private itemPatchTracker: PatchTracker;
    private characterConfigurationTracker: PatchTracker;
    private queuedTileAssetMessages: Array<() => void>;
    private queuedTileActionTreeMessages: Array<() => void>;
    private queuedImageMessages: Array<() => void>;

    private waitingForCleanupAfterDisconnect: boolean;

    public constructor() {
        super();
        this.mapPatchTrackers = new Map<number, PatchTracker[]>();
        this.combatConfigurationPatchTracker = new PatchTracker(this.applyingPatchesCallback);
        this.gameDesignVariablesPatchTracker = new PatchTracker(this.applyingPatchesCallback);
        this.makeshiftTranslationSystemDataPatchTracker = new PatchTracker(this.applyingPatchesCallback);
        this.actionTreePatchTrackersByModelId = new Map<string, PatchTracker>();
        this.animationPatchTracker = new PatchTracker(this.applyingPatchesCallback);
        this.itemPatchTracker = new PatchTracker(this.applyingPatchesCallback);
        this.characterConfigurationTracker = new PatchTracker(this.applyingPatchesCallback);
    }

    public getHotReloadData(): HotReloadData {
        return {
            reloadMapIdOnReconnection: this.reloadMapIdOnReconnection
        };
    }

    public integrateHotReloadData(hotReloadData: HotReloadData) {
        this.reloadMapIdOnReconnection = hotReloadData.reloadMapIdOnReconnection;
    }

    public clearReloadMapIdOnReconnection() {
        this.reloadMapIdOnReconnection = undefined;
    }

    public connect() {
        if (this.socket)
            return;

        let playPublicModuleIds = "";
        if (isPublicGameVariantRoute()) {
            playPublicModuleIds = getURLParameterString(queryParameterPlayPublicModuleIds, "");
        }

        this.socket = io({
            transports: ['websocket'],
            query: {
                username: editorStore.username,
                clientId,
                adminModuleId: !!editorStore.sessionModuleId ? editorStore.sessionModuleId : "",
                playPublicModuleIds
            }
        });

        autorun(() => {
            const { gameInProgress } = gameStore;
            if (!this.socket)
                return;

            this.socket.io.reconnection(!gameInProgress);

            console.log("May reconnect: " + this.socket.io.reconnection());

            if (!gameInProgress && this.waitingForCleanupAfterDisconnect) {
                this.cleanUpAfterDisconnect(true);
            }
        });

        const disposers = new ReactionDisposerGroup();

        let loadMapDisposer: IReactionDisposer;

        let actionTreesLoadedPromiseResolver: () => void;
        let actionTreesLoadedPromise: Promise<void>;

        let tileAssetDataLoadedPromiseResolver: () => void;
        let tileAssetDataLoadedPromise: Promise<void>;

        let animationsPreloadedPromise: Promise<void>;

        let neededNonTileCacheKeyPromises: Array<Promise<string[]>>;
        let neededNonTileCacheKeyAnimationAssetsResolver: (values: string[]) => void;
        let neededNonTileCacheKeyCharacterConfigurationsResolver: (values: string[]) => void;

        const afterConnect = () => {
            this.setUsername(editorStore.username);

            actionTreesLoadedPromise = new Promise(resolve => { actionTreesLoadedPromiseResolver = resolve; });
            tileAssetDataLoadedPromise = new Promise(resolve => { tileAssetDataLoadedPromiseResolver = resolve; });

            neededNonTileCacheKeyPromises = [
                new Promise(resolve => { neededNonTileCacheKeyAnimationAssetsResolver = resolve; }),
                new Promise(resolve => { neededNonTileCacheKeyCharacterConfigurationsResolver = resolve; })
            ];

            editorStore.setTileImageLoadingPercentage(0);

            this.queuedTileAssetMessages = [];
            this.queuedTileActionTreeMessages = [];
            this.queuedImageMessages = [];

            this.socket.emit("startInitialization", addErrorIfSet);

            disposers.addAutorun(this.onSelectedItemChanged.bind(this));
            disposers.addAutorun(this.executeQueuedActionTreeChangesListener.bind(this));

            loadMapDisposer = autorun(async () => {
                if (!editorStore.isConnectedAndReady)
                    return;

                loadMapDisposer();
                loadMapDisposer = null;

                if (this.reloadMapIdOnReconnection) {
                    const status = editorMapStore.getMapStatus(this.reloadMapIdOnReconnection);
                    if (status !== MapStatus.DoesNotExist) {
                        try {
                            await executeWithErrorWrapper(() => this.openMapInMapEditor(mainMapEditorStore.currentMapStore, this.reloadMapIdOnReconnection));
                        } catch (e) {
                            errorStore.addError(ErrorType.General, "editor.error_cannot_load_map", { error: e.toString() });
                        }
                    }

                    this.reloadMapIdOnReconnection = null;
                }
            });
        };

        const afterDisconnect = (reason: Socket.DisconnectReason) => {
            // Clear all disposers
            disposers.disposeAll();

            if (loadMapDisposer) {
                loadMapDisposer();
                loadMapDisposer = null;
            }

            const { currentMapStore } = mainMapEditorStore;
            this.reloadMapIdOnReconnection = currentMapStore.hasCurrentMap ? currentMapStore.currentMapId : null;

            this.queuedTileAssetMessages.length = 0;
            this.queuedTileActionTreeMessages.length = 0;
            this.queuedImageMessages.length = 0;

            const manualReconnectionNecessary = (reason === DisconnectReason.IOServerDisconnect);
            this.cleanUpAfterDisconnect(manualReconnectionNecessary);
        };

        this.registerBasicCallbacks(afterConnect, afterDisconnect, false);

        this.socket.on("initializeClient", (userId, serverGitCommitSHA, combatConfigurationSnapshot, gameDesignVariablesSnapshot, makeshiftTranslationSystemDataSnapshot, sessionModule, soundList) => {
            if (this.reactToServerGitCommitSHA(serverGitCommitSHA))
                return;

            editorStore.setUserId(userId);
            localSettingsStore.setActionTreeValidationEnabled(Boolean(sessionModule));

            if (userStore.shouldUseProductionEditorComplexity) {
                localSettingsStore.setEditorComplexity(EditorComplexity.Production);
            } else {
                localSettingsStore.setEditorComplexity(sessionModule ? sessionModule.editorComplexity : EditorComplexity.Workshop1);
            }

            editorStore.setSessionModule(sessionModule ? sessionModule : null);

            combatStore.setConfig(fromSnapshot<CombatConfigurationModel>(combatConfigurationSnapshot));
            gameStore.setGameDesignVariables(fromSnapshot<GameDesignVariablesModel>(gameDesignVariablesSnapshot));
            translationStore.setMakeshiftTranslationSystemData(fromSnapshot<MakeshiftTranslationSystemDataModel>(makeshiftTranslationSystemDataSnapshot));

            // Create a new loader to ensure that no previous loader is running
            soundCache.createNewLoader();

            const disconnectSignal = this.disconnectAbortController.signal;
            soundCache.setSoundPaths(soundList);
            soundCache
                .loadSoundsWithPrefix(SoundCache.ALL_GAME_SOUND_PREFIX, (percentage) => {
                    if (!disconnectSignal.aborted) {
                        sharedStore.setGameSoundsLoadingPercentage(percentage);
                    }
                })
                .catch(gameStore.addErrorFromErrorObject);

            editorStore.setStartedInitialization();
        });

        this.socket.on("setInitializationPercentage", (value) => {
            editorStore.setInitializationPercentage(value);
        });

        this.socket.on("initializationFinished", async (standaloneModuleStartMapId) => {
            editorStore.setInitialized();

            try {
                const urlParameterMap = getURLParameterNumber("map", undefined);
                if (isMainGameRoute()) {
                    if (urlParameterMap) {
                        gameStore.setSelectedStartMap(urlParameterMap);
                    } else {
                        const { gameStartingMapId } = gameStore.gameDesignVariables;
                        if (gameStartingMapId !== null) {
                            gameStore.setSelectedStartMap(gameStartingMapId);
                        }
                    }
                } else if (urlParameterMap) {
                    await executeWithErrorWrapper(() => this.openMapInMapEditor(mainMapEditorStore.currentMapStore, urlParameterMap));
                } else if (userStore.isWorkshopPlayer || isPublicGameVariantRoute()) {
                    if (standaloneModuleStartMapId) {
                        gameStore.setSelectedStartMap(standaloneModuleStartMapId);
                    } else {
                        const { gameStartingMapId } = gameStore.gameDesignVariables;
                        if (gameStartingMapId !== null) {
                            gameStore.setSelectedStartMap(gameStartingMapId);
                        }
                    }
                }
            } catch (e) {
                errorStore.addError(ErrorType.General, "editor.error_cannot_load_map", { error: e.toString() });
            }
        });

        this.socket.on("allTileAssetsUpdated", async (tileAssetChunkCount, versions, tileAtlasDataArray, thumbnailCatalogue) => {
            const allTileAssetSnapshots = new Array<TileAssetSnapshot>();

            let counter = 0;

            while (true) {
                const tileAssetSnapshots = await this.getNextAllTileAssetsUpdatedChunk();
                if (tileAssetSnapshots.length === 0)
                    break;

                tileAssetSnapshots.forEach(value => allTileAssetSnapshots.push(value));

                counter++;
                sharedStore.setTileAssetDataLoadingPercentage(counter / tileAssetChunkCount);
            }

            sharedStore.setTileAssetDataLoadingPercentage(1);

            tileAssetDataLoadedPromiseResolver();

            const neededNonTileCacheKeysArrays = await Promise.all(neededNonTileCacheKeyPromises);
            const neededNonTileCacheKeys = neededNonTileCacheKeysArrays.flat();

            await tileImageLoader.allTileAssetsUpdated(allTileAssetSnapshots, versions, tileAtlasDataArray, thumbnailCatalogue, this.queuedTileAssetMessages, neededNonTileCacheKeys);
        });

        const tileAssetUpdated = (tileAssetSnapshot: TileAssetSnapshot, backgroundImageData: ArrayBufferWithVersion, waterMaskImageData: ArrayBufferWithVersion, foregroundImageData: ArrayBufferWithVersion, waterMaskForegroundImageData: ArrayBufferWithVersion) => {
            if (!sharedStore.tileAssets) {
                this.queuedTileAssetMessages.push(() => {
                    console.log("Queued tileAssetUpdated", tileAssetSnapshot, backgroundImageData, waterMaskImageData, foregroundImageData, waterMaskForegroundImageData);
                    tileAssetUpdated(tileAssetSnapshot, backgroundImageData, waterMaskImageData, foregroundImageData, waterMaskForegroundImageData);
                });
                return;
            }

            const { id } = tileAssetSnapshot;

            const provide = async (tileImageUsage: TileImageUsage, data: ArrayBufferWithVersion) => {
                const blob = new Blob([data.data]);
                saveInTileImageCache(id, tileImageUsage, data.version, blob).catch(errorStore.addErrorFromErrorObject);
                await tileImageStore.provideTileAssetFromServer(id, tileImageUsage, blob);
            };

            if (backgroundImageData) {
                provide(TileImageUsage.Background, backgroundImageData).catch(errorStore.addErrorFromErrorObject);
            }
            if (waterMaskImageData) {
                provide(TileImageUsage.WaterMask, waterMaskImageData).catch(errorStore.addErrorFromErrorObject);
            }
            if (foregroundImageData) {
                provide(TileImageUsage.Foreground, foregroundImageData).catch(errorStore.addErrorFromErrorObject);
            }
            if (waterMaskForegroundImageData) {
                provide(TileImageUsage.WaterMaskForeground, waterMaskForegroundImageData).catch(errorStore.addErrorFromErrorObject);
            }

            sharedStore.updateTileAssetFromSnapshot(tileAssetSnapshot);
        };
        this.socket.on("tileAssetUpdated", tileAssetUpdated);

        const tileAssetDeleted = (id: string) => {
            if (!sharedStore.tileAssets) {
                this.queuedTileAssetMessages.push(() => {
                    console.log("Queued tileAssetDeleted", id);
                    tileAssetDeleted(id);
                });
                return;
            }

            sharedStore.deleteTileAsset(id);
        };
        this.socket.on("tileAssetDeleted", tileAssetDeleted);

        this.socket.on("allCharacterConfigurationsUpdated", async (configurationSnapshots) => {
            const map = new Map(configurationSnapshots.map(snapshot => [snapshot.id, fromSnapshot<CharacterConfigurationModel>(snapshot)]));
            sharedStore.setCharacters(map);

            const generateIds = wrapIterator(sharedStore.characterConfigurations.values())
                .filter(character => sharedStore.getAnimationByName(character.animationAssetName))
                .map(character => character.id);

            neededNonTileCacheKeyCharacterConfigurationsResolver(
                generateIds.map(id => generatedImageCacheKey(id.toString(), GeneratedImageType.CharacterConfig))
            );

            // Thumbnails are only relevant/necessary for users who can access the editor
            // (i.e. users who have editor rights and are not on /game route where no links lead to the editor)
            if (!userStore.mayAccessEditor || isMainGameRoute())
                return;

            const abortSignal = this.disconnectAbortSignal;

            // Prerender characterConfiguration thumbnails (or load them from cache) after all animations are preloaded
            await animationsPreloadedPromise;

            if (abortSignal.aborted)
                return;

            const stats = {
                thumbnailsAlreadyLoaded: 0,
                thumbnailsFromCache: 0,
                generatedThumbnails: 0
            };

            await spawnAsyncWorkers(5, async () => {
                while (generateIds.length > 0 && !abortSignal.aborted) {
                    const characterId = generateIds.shift();

                    const version = makeCharacterConfigurationThumbnailVersion(sharedStore.getCharacter(characterId));
                    if (characterThumbnailStore.isSetWithVersion(characterId, version)) {
                        stats.thumbnailsAlreadyLoaded++;
                        continue;
                    }

                    const cacheImageBlob = await loadFromGeneratedImageCacheIfVersionMatchesElsePrune(characterId.toString(), GeneratedImageType.CharacterConfig, version);
                    if (cacheImageBlob) {
                        stats.thumbnailsFromCache++;
                        characterThumbnailStore.setFromCache(characterId, URL.createObjectURL(cacheImageBlob), version);
                    } else {
                        stats.generatedThumbnails++;
                        characterThumbnailStore.getOrGenerateThumbnail(characterId);
                        await wait(50);
                    }
                }
            });

            console.log("Preloaded character thumbnails.", stats);
        });

        this.socket.on("characterConfigurationCreated", (characterSnapshot => {
            sharedStore.putCharacter(CharacterConfigurationModel.fromSnapshot(characterSnapshot));
        }));

        this.socket.on("characterConfigurationChanged", ((characterConfigId, patches) => {
            const char = sharedStore.characterConfigurations.get(characterConfigId);
            this.patch(char, patches);
            const selected = charEditorStore.selectedCharacterConfiguration;
            if (selected && selected.id == char.id) {
                charEditorStore.setSelectedCharacter(char);
            }
        }));

        this.socket.on("characterConfigurationDeleted", async (characterId) => {
            sharedStore.deleteCharacter(characterId);
            const selected = charEditorStore.selectedCharacterConfiguration;
            if (selected && selected.id == characterId) {
                charEditorStore.setSelectedCharacter(null);
            }
        });

        this.socket.on("characterConfigurationUnDeleted", async (characterSnapshot: CharacterConfigurationSnapshot) => {
            sharedStore.putCharacter(CharacterConfigurationModel.fromSnapshot(characterSnapshot));
        });

        this.socket.on("allAnimationAssetsUpdated", async (animationAssetSnapshots) => {
            const map = new Map(animationAssetSnapshots.map(snapshot => [snapshot.id, fromSnapshot<AnimationAssetModel>(snapshot)]));
            sharedStore.setAnimations(map);

            const abortSignal = this.disconnectAbortSignal;

            const animationAssets = Array.from(sharedStore.animationAssets.values());

            // As long as we work to preload everything, it's not necessary to set a priority order anymore
            /*
            const prioritySortOrder = new Map<AnimationType, number>();
            prioritySortOrder.set(AnimationType.BodyType, 0);
            prioritySortOrder.set(AnimationType.Map, 1);
            prioritySortOrder.set(AnimationType.NPC, 2);
            prioritySortOrder.set(AnimationType.None, 3);
            animationAssets.sort((a, b) => prioritySortOrder.get(a.metaData.type) - prioritySortOrder.get(b.metaData.type));
            */

            const animationAssetIds = animationAssets.map(animationAsset => animationAsset.id);
            const animationAssetIdsThatShouldHaveThumbnails = animationAssets
                .filter(animationAsset => animationAsset.isType(AnimationType.Map))
                .map(animationAsset => animationAsset.id);

            neededNonTileCacheKeyAnimationAssetsResolver(
                [
                    ...animationAssetIds.map(id => animationCacheKey(id)),
                    ...animationAssetIdsThatShouldHaveThumbnails.map(id => generatedImageCacheKey(id.toString(), GeneratedImageType.AnimationAsset))
                ]
            );

            // Preload animation assets and generate preview images where necessary,
            // but only after all action trees are completely loaded
            animationsPreloadedPromise = tileAssetDataLoadedPromise.then(async () => {
                const stats = {
                    fromCache: 0,
                    fromServer: 0,
                    alreadyLoaded: 0,
                    thumbnailsFromCache: 0,
                    generatedThumbnails: 0,
                    thumbnailsAlreadyLoaded: 0
                };

                console.log("Loading animations from cache...");

                const preloadIdsFromServerQueue = new Array<number>();

                // Try to load animations from cache. This is using many workers to work around the slow IndexDB getters.
                const preloadIdFromCacheQueue = Array.from(animationAssetIds);
                await spawnAsyncWorkers(10, async () => {
                    while (preloadIdFromCacheQueue.length > 0 && !abortSignal.aborted) {
                        try {
                            const animationId = preloadIdFromCacheQueue.shift();
                            if (!sharedStore.animationAssets.has(animationId))
                                continue;

                            const status = await animationLoader.loadAnimationDataFromLocalCacheIntoAnimationLoaderCache(animationId);
                            switch (status) {
                                case LocalCacheLoadingResult.AlreadyLoaded:
                                    stats.alreadyLoaded++;
                                    break;

                                case LocalCacheLoadingResult.LoadedFromCache:
                                    stats.fromCache++;
                                    break;

                                case LocalCacheLoadingResult.NotFoundInCache:
                                    preloadIdsFromServerQueue.push(animationId);
                                    break;

                                default:
                                    throw new Error("Not implemented: " + status);
                            }
                        } catch (e) {
                            errorStore.addErrorFromErrorObject(e);
                        } finally {
                            const animationsLoadedTotal = stats.alreadyLoaded + stats.fromCache + stats.fromServer;
                            sharedStore.setAnimationAssetLoadingPercentage(animationsLoadedTotal / animationAssetIds.length);
                        }
                    }
                });

                console.log("Loading animations from server...");

                // Call animationLoader.loadAnimationDataCached() to load and generate everything that is still missing.
                // This is only using 2 workers to not overwhelm both this client and the server with calls.
                await spawnAsyncWorkers(2, async () => {
                    while (preloadIdsFromServerQueue.length > 0 && !abortSignal.aborted) {
                        try {
                            const animationId = preloadIdsFromServerQueue.shift();
                            if (!sharedStore.animationAssets.has(animationId))
                                continue;

                            await animationLoader.loadAnimationDataCached(animationId);
                            stats.fromServer++;
                        } catch (e) {
                            errorStore.addErrorFromErrorObject(e);
                        } finally {
                            const animationsLoadedTotal = stats.alreadyLoaded + stats.fromCache + stats.fromServer;
                            sharedStore.setAnimationAssetLoadingPercentage(animationsLoadedTotal / animationAssetIds.length);
                        }
                    }
                });

                console.log("Loading/generating animation thumbnails...");

                sharedStore.setAnimationsInitialized();

                // Thumbnails are only relevant/necessary for users who can access the editor
                // (i.e. users who have editor rights and are not on /game route where no links lead to the editor)
                if (userStore.mayAccessEditor && !isMainGameRoute()) {
                    const loadOrGenerateThumbnailIdQueue = Array.from(animationAssetIdsThatShouldHaveThumbnails);
                    await spawnAsyncWorkers(25, async () => {
                        while (loadOrGenerateThumbnailIdQueue.length > 0 && !abortSignal.aborted) {
                            const id = loadOrGenerateThumbnailIdQueue.shift();

                            if (animationThumbnailStore.isSet(id)) {
                                stats.thumbnailsAlreadyLoaded++;
                                continue;
                            }

                            const cacheImageBlob = await loadFromGeneratedImageCacheIfVersionMatchesElsePrune(id.toString(), GeneratedImageType.AnimationAsset, null);
                            if (cacheImageBlob) {
                                stats.thumbnailsFromCache++;
                                animationThumbnailStore.setFromCache(id, URL.createObjectURL(cacheImageBlob), null);
                            } else {
                                stats.generatedThumbnails++;
                                animationThumbnailStore.getOrGenerateThumbnail(id);
                            }
                        }
                    });
                }

                console.log("Preloaded animations.", stats);
            }).catch(errorStore.addErrorFromErrorObject);
        });

        this.socket.on("animationAssetChanged", async (id: number, patches: AugmentedPatch[]) => {
            const animation = sharedStore.getAnimation(id);
            if (animation) {
                this.patch(animation, patches);
            }
        });

        this.socket.on("animationAssetDeleted", async (animationId) => {
            sharedStore.deleteAnimation(animationId);
        });

        this.socket.on("animationAssetUnDeleted", async (animationSnapshot) => {
            sharedStore.setAnimation(fromSnapshot<AnimationAssetModel>(animationSnapshot));
        });

        this.socket.on("animationAssetCreated", async (animationSnapshot) => {
            sharedStore.setAnimation(fromSnapshot<AnimationAssetModel>(animationSnapshot));
        });

        this.socket.on("mapListUpdated", (mapList) => {
            editorMapStore.setMapList(mapList);
        });

        this.socket.on("mapDeleted", (id, deletedByThisUser) => {
            editorMapStore.removeDeletedMap(id, deletedByThisUser);
        });

        this.socket.on("currentMapUserListUpdated", (userList) => {
            currentMapUserListStore.updateCurrentMapUserList(userList);
        });

        this.socket.on("mapDynamicMapElementsChanged", (mapId, patches) => {
            const map = editorMapStore.maps.get(mapId);
            if (map) {
                this.patch(map.dynamicMapElements, patches);
            }
        });

        this.socket.on("mapPropertiesChanged", (mapId, patch) => {
            const map = editorMapStore.maps.get(mapId);
            if (map) {
                this.patch(map.properties, patch);
            }
        });

        this.socket.on("tilesUpdated", (mapId: number, tiles, plane) => {
            const map = editorMapStore.maps.get(mapId);
            if (map) {
                for (const tile of tiles) {
                    const { position: { x, y, layer }, newData } = tile;
                    map.setTile(x, y, layer, plane, newData);
                }
            }
        });

        this.socket.on("combatConfigurationChanged", (patches) => {
            this.patch(combatStore.config, patches);
        });

        this.socket.on("gameDesignVariablesChanged", (patch) => {
            this.patch(gameStore.gameDesignVariables, patch);
        });

        this.socket.on("MakeshiftTranslationSystemDataChanged", (patch) => {
            this.patch(translationStore.makeshiftTranslationSystemData, patch);
        });

        this.socket.on("allActionTreesUpdated", async (actionTreeCount) => {
            const actionTrees = new Array<ActionTreeModel>();

            sharedStore.setActionTreeLoadingPercentage(0);

            while (actionTrees.length < actionTreeCount) {
                const newActionTreeSnapshots = await this.getNextAllActionTreesUpdatedChunk();

                for (const snapshot of newActionTreeSnapshots) {
                    actionTrees.push(fromSnapshot<ActionTreeModel>(snapshot));
                }

                sharedStore.setActionTreeLoadingPercentage(actionTrees.length / actionTreeCount);
            }

            runInAction(() => {
                sharedStore.setActionTrees(actionTrees);
                actionEditorStore.setSelectedActionTreeHierarchy(null);

                sharedStore.setActionTreeLoadingPercentage(1);
            });

            actionTreesLoadedPromiseResolver();
        });

        const actionTreesCreated = (actionTreeSnapshots: ActionTreeSnapshot[]) => {
            if (this.shouldQueueActionTreeChanges) {
                this.queuedTileActionTreeMessages.push(() => {
                    //console.log("Queued actionTreeCreated", actionTreeSnapshots);
                    actionTreesCreated(actionTreeSnapshots);
                });
                return;
            }

            sharedStore.addActionTreesFromSnapshots(actionTreeSnapshots);
        };
        this.socket.on("actionTreesCreated", actionTreesCreated);

        const actionTreesDeleted = (actionTreeModelIds: string[]) => {
            if (this.shouldQueueActionTreeChanges) {
                this.queuedTileActionTreeMessages.push(() => {
                    //console.log("Queued actionTreeDeleted", actionTreeModelIds);
                    actionTreesDeleted(actionTreeModelIds);
                });
                return;
            }

            sharedStore.removeActionTrees(actionTreeModelIds);
        };
        this.socket.on("actionTreesDeleted", actionTreesDeleted);

        const actionTreeChanged = (actionTreeModelId: string, patches: AugmentedPatch[]) => {
            if (this.shouldQueueActionTreeChanges) {
                this.queuedTileActionTreeMessages.push(() => {
                    //console.log("Queued actionTreeChanged", actionTreeModelId, patches);
                    actionTreeChanged(actionTreeModelId, patches);
                });
                return;
            }

            const actionTree = sharedStore.actionTreesById.get(actionTreeModelId);
            if (actionTree) {
                this.patch(actionTree, patches);
            }
        };
        this.socket.on("actionTreeChanged", actionTreeChanged);

        this.socket.on("allItemsUpdated", async (itemSnapshots) => {
            const serverItems = new Map(itemSnapshots.map(i => [i.id, fromSnapshot<ItemModel>(i)]));
            itemStore.setAllItems(serverItems);
        });

        this.socket.on("itemUpdated", async (itemSnapshot) => {
            itemStore.setItem(fromSnapshot<ItemModel>(itemSnapshot));
        });

        this.socket.on("itemDeleted", async (itemId: string) => {
            if (itemStore.getItem(itemId)) {
                if (itemStore.selectedItem?.id === itemId) {
                    itemStore.setSelectedItem(null);
                }
                itemStore.deleteItemById(itemId);
            }
        });

        this.socket.on("itemChanged", async (itemId: string, patch: AugmentedPatch) => {
            const item = itemStore.getItem(itemId);
            if (item) {
                this.patch(item, patch);
            }
        });

        this.socket.on("allImagesUpdated", async (imageSnapshots: ImageSnapshot[]) => {
            const imageIds = new Set(imageSnapshots.map(image => image.id));
            imageStore.prune(imageIds);

            const count = imageSnapshots.length;
            let counter = 0;

            imageStore.setLoadingPercentage(0);

            const abortSignal = this.disconnectAbortSignal;

            const preloadLater = new Array<ImageSnapshot>();

            // Preload texture images and set URLs for non-texture images
            await spawnAsyncWorkers(10, async () => {
                while (imageSnapshots.length > 0 && !abortSignal.aborted) {
                    const imageSnapshot = imageSnapshots.shift();
                    const shouldBePreloaded = await imageStore.addImage(imageSnapshot, abortSignal);
                    if (shouldBePreloaded) {
                        preloadLater.push(imageSnapshot);
                    }

                    counter++;
                    imageStore.setLoadingPercentage(counter / count);
                }
            });

            imageStore.setLoadingPercentage(1);

            this.queuedImageMessages.forEach(queuedMessage => queuedMessage());
            this.queuedImageMessages.length = 0;

            // Preload non-texture images after all action trees and animations are loaded
            Promise.all([actionTreesLoadedPromise, animationsPreloadedPromise]).then(() => {
                return spawnAsyncWorkers(1, async () => {
                    while (preloadLater.length > 0 && !abortSignal.aborted) {
                        try {
                            const imageSnapshot = preloadLater.shift();
                            await imageStore.preloadHTMLImage(imageSnapshot);
                        } catch (e) {
                            // HACK tw: Sometimes, image preloading fails with a "net::ERR_HTTP2_PROTOCOL_ERROR 200"
                            // and I cannot figure out why. It seems to happen when the browser is busy loading animations
                            // (so possibly only on first load, before the animations are cached).
                            //
                            // For now I
                            //  a) only start loading after all animations are preloaded and
                            //  b) pre-load images one by one (instead of 5 at a time like before)
                            // to reduce the load as much as possible.
                            //
                            // However, in the case that it still fails, there is no actual need to show it to the user
                            // since the app will work just fine (and the image will be shown just fine later after a short
                            // delay due to not being preloaded).
                            //
                            // We still want to log it to the console and send it to Sentry though, because this is a definitely
                            // a bug and we want to know this is still happening.
                            console.error(e);
                            Sentry.captureException(e);
                            //errorStore.addErrorFromErrorObject(e);
                        }
                    }
                });
            }).catch(errorStore.addErrorFromErrorObject);
        });

        const imageCreated = (imageSnapshot: ImageSnapshot, imageData: ArrayBuffer) => {
            if (!imageStore.completelyLoaded) {
                this.queuedImageMessages.push(() => {
                    console.log("Queued imageCreated", imageSnapshot, imageData);
                    imageCreated(imageSnapshot, imageData);
                });
                return;
            }

            if (imageData) {
                imageStore
                    .setImageFromBlob(imageSnapshot, new Blob([imageData]))
                    .catch(errorStore.addErrorFromErrorObject);
            } else {
                imageStore.setImageJustWithUrl(imageSnapshot);
            }
        };

        this.socket.on("imageCreated", imageCreated);

        const imageDeleted = (imageId: number) => {
            if (!imageStore.completelyLoaded) {
                this.queuedImageMessages.push(() => {
                    console.log("Queued imageDeleted", imageId);
                    imageDeleted(imageId);
                });
                return;
            }

            imageStore.imageDeleted(imageId);
        };

        this.socket.on("imageDeleted", imageDeleted);
    }

    private cleanUpAfterDisconnect(manuallyConnectAfterCleanup: boolean) {
        if (gameStore.gameInProgress) {
            this.waitingForCleanupAfterDisconnect = true;
            return;
        }

        this.waitingForCleanupAfterDisconnect = false;

        runInAction(() => {
            currentMapUserListStore.clearCurrentMapUserList();
            mapEditorStores.forEach(store => store.currentMapStore.clearCurrentMap());
            editorMapStore.clearMaps();
            charEditorStore.setSelectedCharacter(null);
            animationEditorStore.setSelectedAnimation(null).catch(errorStore.addErrorFromErrorObject);
            sharedStore.clear();
            actionEditorStore.setSelectedActionTreeHierarchy(null);
            actionEditorStore.deselectSelectedAction();
            editorStore.setDisconnected();
            combatStore.setConfig(null);
            combatEditorStore.clear();
            managementStore.clear();
            imageStore.setLoadingPercentage(0);

            tileAssetEditorStore.setPlacementSelection(null);

            mainMapEditorStore.clearPlacementSelection();
            mainMapEditorStore.setSelectedTilePosition(null);

            selectorMapEditorStore.clearPlacementSelection();
            selectorMapEditorStore.setSelectedTilePosition(null);

            undoStore.clear();
        });

        console.log("Completed disconnection cleanup.");

        if (manuallyConnectAfterCleanup) {
            this.socket.connect();
        }
    }

    public get disconnectAbortSignal() {
        return this.disconnectAbortController.signal;
    }

    public get shouldQueueActionTreeChanges() {
        return !sharedStore.actionTreesInitialized || gameStore.blockSharedActionTrees;
    }

    public executeQueuedActionTreeChangesListener() {
        if (!this.shouldQueueActionTreeChanges) {
            this.queuedTileActionTreeMessages.forEach(message => message());
            this.queuedTileActionTreeMessages.length = 0;
        }
    }

    public setUsername(username: string) {
        this.socket.emit("setUsername", username, addErrorIfSet);
    }

    public createImage(clientImageSnapshot: ImageSnapshot, imageData: ArrayBuffer) {
        return this.actionPromise<ImageSnapshot>((resolve, reject) => {
            this.socket.emit("createImage", clientImageSnapshot, imageData, (error, imageSnapshot) => {
                try {
                    throwIfErrorSet(error);
                    resolve(imageSnapshot);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public deleteImage(imageId: number) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("deleteImage", imageId, autoResolveRejectCallback(resolve, reject));
        });
    }

    public undeleteImage(imageId: number) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("undeleteImage", imageId, autoResolveRejectCallback(resolve, reject));
        });
    }

    public createItem(item: ItemModel) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("createItem", getSnapshot(item), autoResolveRejectCallback(resolve, reject));
        });
    }

    public deleteItem(itemId: string) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("deleteItem", itemId, autoResolveRejectCallback(resolve, reject));
        });
    }

    public unDeleteItem(itemId: string) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("unDeleteItem", itemId, autoResolveRejectCallback(resolve, reject));
        });
    }

    private onSelectedItemChanged() {
        const { selectedItem } = itemStore;

        this.itemPatchTracker.stopTracking();

        if (selectedItem) {
            this.itemPatchTracker.startTracking(
                selectedItem,
                (patch, inversePatch) => undoableItemEditorSubmitItemChanges(selectedItem.id, patch, inversePatch)
            );
        }
    }

    public patchItem(itemId: string, patch: AugmentedPatch) {
        const item = itemStore.getItem(itemId);
        this.patch(item, patch);
    }

    public submitItemChanges(itemId: string, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("submitItemChanges", itemId, patch, inversePatch, autoResolveRejectCallback(resolve, reject));
        });
    }

    public getNextAllTileAssetsUpdatedChunk() {
        return this.actionPromise<TileAssetSnapshot[]>((resolve, reject) => {
            this.socket.emit("getNextAllTileAssetsUpdatedChunk", async (error, tileAssetSnapshots) => {
                try {
                    throwIfErrorSet(error);
                    resolve(tileAssetSnapshots);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public getNextAllActionTreesUpdatedChunk() {
        return this.actionPromise<ActionTreeSnapshot[]>((resolve, reject) => {
            this.socket.emit("getNextAllActionTreesUpdatedChunk", async (error, actionTreeSnapshots) => {
                try {
                    throwIfErrorSet(error);
                    resolve(actionTreeSnapshots);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public updateTileAsset(tileAsset: TileAssetModel, backgroundImageData: ArrayBuffer, waterMaskImageData: ArrayBuffer, foregroundImageData: ArrayBuffer, waterMaskForegroundImageData: ArrayBuffer) {
        this.updateTileAssetWithPromise(tileAsset, backgroundImageData, waterMaskImageData, foregroundImageData, waterMaskForegroundImageData)
            .catch(errorStore.addErrorFromErrorObject);
    }

    public updateTileAssetWithPromise(tileAsset: TileAssetModel, backgroundImageData: ArrayBuffer, waterMaskImageData: ArrayBuffer, foregroundImageData: ArrayBuffer, waterMaskForegroundImageData: ArrayBuffer) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("updateTileAsset", getSnapshot(tileAsset), backgroundImageData, waterMaskImageData, foregroundImageData, waterMaskForegroundImageData, autoResolveRejectCallback(resolve, reject));
        });
    }

    public deleteTileAsset(id: string) {
        this.socket.emit("deleteTileAsset", id, addErrorIfSet);
    }

    public getTileAssetImage(id: string, usage: TileImageUsage) {
        return this.actionPromise<ArrayBufferWithVersion>((resolve, reject) => {
            this.socket.emit("getTileAssetImage", id, usage, async (error, imageData) => {
                try {
                    throwIfErrorSet(error);
                    resolve(imageData);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public getTileAssetImageAtlasImage(name: string) {
        return this.actionPromise<ArrayBuffer>((resolve, reject) => {
            this.socket.emit("getTileAssetImageAtlasImage", name, async (error, image) => {
                try {
                    throwIfErrorSet(error);
                    resolve(image);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public startTrackingCharacterConfiguration(characterConfiguration: CharacterConfigurationModel) {
        this.characterConfigurationTracker.startTracking(
            characterConfiguration,
            (patch, inversePatch) => {
                undoableCharacterEditorSubmitCharacterConfigurationsChanges(characterConfiguration.id, patch, inversePatch);
            }
        );
    }

    public stopTrackingCharacterConfiguration() {
        this.characterConfigurationTracker.stopTracking();
    }

    public submitCharacterConfigurationChanges(characterConfigurationId: number, patches: AugmentedPatch[], inversePatches: AugmentedPatch[]) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("submitCharacterConfigurationChanges", characterConfigurationId, patches, inversePatches, autoResolveRejectCallback(resolve, reject));
        });
    }

    public createCharacterConfiguration(snapshot: CharacterConfigurationSnapshot) {
        return this.actionPromise<CharacterConfigurationSnapshot>((resolve, reject) => {
            this.socket.emit("createCharacterConfiguration", snapshot, (error, createdSnapshot) => {
                autoResolveRejectWithResultCallback(resolve, reject, error, createdSnapshot);
            });
        });
    }

    public deleteCharacterConfiguration(characterId: number) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("deleteCharacterConfiguration", characterId, autoResolveRejectCallback(resolve, reject));
        });
    }

    public unDeleteCharacterConfiguration(characterId: number) {
        return this.actionPromise<CharacterConfigurationSnapshot>((resolve, reject) => {
            this.socket.emit("unDeleteCharacterConfiguration", characterId, (error, characterSnapshot) => {
                autoResolveRejectWithResultCallback(resolve, reject, error, characterSnapshot);
            });
        });
    }

    public createAnimationAsset(snapshot: AnimationAssetSnapshot, skeletonData: ArrayBuffer, imageData: ArrayBuffer, atlasData: ArrayBuffer) {
        return this.actionPromise<AnimationAssetSnapshot>((resolve, reject) => {
            this.socket.emit("createAnimationAsset", snapshot, skeletonData, imageData, atlasData, (error, animationSnapshot) => {
                autoResolveRejectWithResultCallback(resolve, reject, error, animationSnapshot);
            });
        });
    }

    public deleteAnimationAsset(animationId: number) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("deleteAnimationAsset", animationId, autoResolveRejectCallback(resolve, reject));
            animationLoader.clearAnimationDataCache(animationId);
        });
    }

    public unDeleteAnimationAsset(animationId: number) {
        return this.actionPromise<AnimationAssetSnapshot>((resolve, reject) => {
            this.socket.emit("unDeleteAnimationAsset", animationId, (error, animationSnapshot) => {
                autoResolveRejectWithResultCallback(resolve, reject, error, animationSnapshot);
            });
        });
    }

    public createNewMap(currentMapStore: CurrentMapStore, mapName: string) {
        currentMapStore.setRunningMapOperation(true);
        return this.actionPromise<number>((resolve, reject) => {
            this.socket.emit("createNewMap", mapName, (error, id, mapSnapshot) => {
                currentMapStore.setRunningMapOperation(false);
                try {
                    throwIfErrorSet(error);
                    editorMapStore.addMap(id, fromSnapshot<MapDataModel>(mapSnapshot));
                    currentMapStore.setCurrentMap(id);
                    resolve(id);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public async openMapInMapEditor(currentMapStore: CurrentMapStore, id: number): Promise<void> {
        currentMapStore.setRunningMapOperation(true);

        try {
            const mapResult = this.loadMapIfNotLoaded(id);

            if (mapResult === LoadMapResult.DoesNotExist) {
                throw new Error("Couldn't open map that doesn't exist");
            } else {
                await editorMapStore.mapLoadingPromises.get(id);
                currentMapStore.setCurrentMap(id);
            }
        } finally {
            currentMapStore.setRunningMapOperation(false);
        }
    }

    public loadMapIfNotLoaded(id: number): LoadMapResult {
        const status = editorMapStore.getMapStatus(id);

        //console.log(`loadMapIfNotLoaded(${id}) called, status is ${MapStatus[status]}`);

        switch (status) {
            case MapStatus.DoesNotExist:
                return LoadMapResult.DoesNotExist;

            case MapStatus.Loading:
                return LoadMapResult.Loading;

            case MapStatus.Loaded:
                return LoadMapResult.AlreadyLoaded;
        }

        const promise = this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("loadMap", id, (error, mapSnapshot) => {
                try {
                    throwIfErrorSet(error);
                    editorMapStore.addMap(id, fromSnapshot<MapDataModel>(mapSnapshot));
                    resolve();
                } catch (e) {
                    editorMapStore.setMapFailed(id);
                    errorStore.addErrorFromErrorObject(e);
                    reject(e);
                }
            });
        });
        editorMapStore.setMapLoading(id, promise);

        return LoadMapResult.Loading;
    }

    public setCurrentMap(id: number) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("setCurrentMap", id, (error, userList) => {
                try {
                    throwIfErrorSet(error);
                    currentMapUserListStore.setCurrentMapUserList(id, userList);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public closeCurrentMap() {
        currentMapUserListStore.clearCurrentMapUserList();
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("closeCurrentMap", autoResolveRejectCallback(resolve, reject));
        });
    }

    public deleteMap(currentMapStore: CurrentMapStore, id: number) {
        currentMapStore.setRunningMapOperation(true);
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("deleteMap", id, (error) => {
                currentMapStore.setRunningMapOperation(false);
                resolveRejectCallback(error, resolve, reject);
            });
        });
    }

    public undeleteMap(currentMapStore: CurrentMapStore, id: number) {
        currentMapStore.setRunningMapOperation(true);
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("undeleteMap", id, (error) => {
                currentMapStore.setRunningMapOperation(false);
                resolveRejectCallback(error, resolve, reject);
            });
        });
    }

    public startTrackingMap(mapData: MapDataModel, mapId: number) {
        const dynamicMapElementsPatchTracker = new PatchTracker(this.applyingPatchesCallback);
        dynamicMapElementsPatchTracker.startTracking(
            mapData.dynamicMapElements,
            (patch, inversePatch) => undoableMapEditorSubmitCurrentMapDynamicMapElementsChanges(mapId, patch, inversePatch)
        );

        const mapPropertiesPatchTracker = new PatchTracker(this.applyingPatchesCallback);
        mapPropertiesPatchTracker.startTracking(
            mapData.properties,
            (patch, inversePatch) => undoableMapEditorSubmitCurrentMapPropertyChanges(mapId, patch, inversePatch)
        );

        this.mapPatchTrackers.set(mapId, [
            dynamicMapElementsPatchTracker,
            mapPropertiesPatchTracker
        ]);
    }

    public stopTrackingMap(mapId: number) {
        this.mapPatchTrackers.get(mapId).forEach(tracker => tracker.stopTracking());
        this.mapPatchTrackers.delete(mapId);
    }

    public stopTrackingAllMaps() {
        this.mapPatchTrackers.forEach(trackers => trackers.forEach(tracker => tracker.stopTracking()));
        this.mapPatchTrackers.clear();
    }

    public submitDynamicMapElementsChanges(mapId: number, patches: AugmentedPatch[], inversePatches: AugmentedPatch[], isUndoOrRedo: boolean) {
        if (!isUndoOrRedo && ((patches.length > 1) || (inversePatches.length > 1))) {
            console.error("Currently, multiple patches/inversePatches are only allowed when undoing/redoing. Please report this to Tobias.", { patches, inversePatches });
            throw new Error("Currently, multiple patches/inversePatches are only allowed when undoing/redoing. Please report this to Tobias.");
        }

        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("submitDynamicMapElementsChanges", mapId, patches, inversePatches, autoResolveRejectCallback(resolve, reject));
        });
    }

    public submitCurrentMapPropertyChanges(mapId: number, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("submitCurrentMapPropertyChanges", mapId, patch, inversePatch, autoResolveRejectCallback(resolve, reject));
        });
    }

    public setCurrentMapTiles(currentMapStore: CurrentMapStore, tiles: NewAndOldChangeableTileDataSnapshotWithPosition[], plane: number) {
        const { currentMap, currentMapId } = currentMapStore;

        for (const tile of tiles) {
            const { position: { x, y, layer }, previousData } = tile;
            const currentTileData = currentMap.getTile(x, y, layer, plane);
            if (!tileDataEqualsChangeableTileDataSnapshot(currentTileData, previousData))
                throw new TranslatedError("editor.error_set_tiles_unexpected_current_value");
        }

        for (const tile of tiles) {
            const { position: { x, y, layer }, newData } = tile;
            currentMap.setTile(x, y, layer, plane, newData);
        }

        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("setTiles", currentMapId, tiles, plane, autoResolveRejectCallback(resolve, reject));
        });
    }

    public startTrackingCombatConfiguration() {
        this.combatConfigurationPatchTracker.startTracking(
            combatStore.config,
            undoableCombatConfigurationSubmitChanges
        );
    }

    public submitCombatConfigurationChanges(patches: AugmentedPatch[], inversePatches: AugmentedPatch[], isUndoOrRedo: boolean) {
        if (!isUndoOrRedo && ((patches.length > 1) || (inversePatches.length > 1))) {
            console.error("Currently, multiple patches/inversePatches are only allowed when undoing/redoing. Please report this to Tobias.", { patches, inversePatches });
            throw new Error("Currently, multiple patches/inversePatches are only allowed when undoing/redoing. Please report this to Tobias.");
        }

        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("submitCombatConfigurationChanges", patches, inversePatches, autoResolveRejectCallback(resolve, reject));
        });
    }

    public stopTrackingCombatConfiguration() {
        this.combatConfigurationPatchTracker.stopTracking();
    }

    public submitGameDesignVariablesChanges(patch: AugmentedPatch, inversePatch: AugmentedPatch, isUndoOrRedo: boolean) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("submitGameDesignVariablesChanges", patch, inversePatch, autoResolveRejectCallback(resolve, reject));
        });
    }

    public startTrackingGameDesignVariables() {
        this.gameDesignVariablesPatchTracker.startTracking(
            gameStore.gameDesignVariables,
            undoableGameDesignVariablesSubmitChanges
        );
    }

    public stopTrackingGameDesignVariables() {
        this.gameDesignVariablesPatchTracker.stopTracking();
    }

    public submitMakeshiftTranslationSystemDataChanges(patch: AugmentedPatch, inversePatch: AugmentedPatch) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("submitMakeshiftTranslationSystemDataChanges", patch, inversePatch, autoResolveRejectCallback(resolve, reject));
        });
    }

    public startTrackingMakeshiftTranslationSystemData() {
        this.makeshiftTranslationSystemDataPatchTracker.startTracking(
            translationStore.makeshiftTranslationSystemData,
            undoableMakeshiftTranslationSystemDataSubmitChanges
        );
    }

    public stopTrackingMakeshiftTranslationSystemData() {
        this.makeshiftTranslationSystemDataPatchTracker.stopTracking();
    }

    public createActionTrees(newActionTreeSnapshots: ActionTreeSnapshot[]) {
        actionEditorStore.setRunningActionTreeOperation(true);
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("createActionTrees", newActionTreeSnapshots, (error) => {
                actionEditorStore.setRunningActionTreeOperation(false);
                resolveRejectCallback(error, resolve, reject);
            });
        });
    }

    public deleteActionTrees(actionTreeSnapshots: ActionTreeSnapshot[]) {
        actionEditorStore.setRunningActionTreeOperation(true);
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("deleteActionTrees", actionTreeSnapshots, (error) => {
                actionEditorStore.setRunningActionTreeOperation(false);
                resolveRejectCallback(error, resolve, reject);
            });
        });
    }

    public unDeleteActionTrees(actionTreeModelIds: string[]) {
        if (actionTreeModelIds.some(id => sharedStore.actionTreesById.has(id)))
            throw new TranslatedError("editor.error_action_tree_already_undeleted");

        actionEditorStore.setRunningActionTreeOperation(true);
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("undeleteActionTrees", actionTreeModelIds, (error) => {
                actionEditorStore.setRunningActionTreeOperation(false);
                resolveRejectCallback(error, resolve, reject);
            });
        });
    }

    public startTrackingActionTree(actionTree: ActionTreeModel) {
        const patchTracker = new PatchTracker(this.applyingPatchesCallback);
        this.actionTreePatchTrackersByModelId.set(actionTree.$modelId, patchTracker);

        patchTracker.startTracking(
            actionTree,
            (patch, inversePatch) => {
                undoableActionEditorSubmitChanges(actionTree.$modelId, patch, inversePatch);
            }
        );
    }

    public submitActionTreeChanges(actionTreeModelId: string, patches: AugmentedPatch[], inversePatches: AugmentedPatch[], isUndoOrRedo: boolean) {
        const executeAsManyAsPossible = !isUndoOrRedo;

        return this.actionPromise<PatchCheckResult[]>((resolve, reject) => {
            this.socket.emit("submitActionTreeChanges", actionTreeModelId, patches, inversePatches, executeAsManyAsPossible, (error, patchResultsForExecuteAsManyAsPossible) => {
                try {
                    throwIfErrorSet(error);
                    resolve(patchResultsForExecuteAsManyAsPossible);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public stopTrackingActionTree(actionTree: ActionTreeModel) {
        this.actionTreePatchTrackersByModelId.get(actionTree.$modelId).stopTracking();
        this.actionTreePatchTrackersByModelId.delete(actionTree.$modelId);
    }

    public stopTrackingAllActionTrees() {
        this.actionTreePatchTrackersByModelId.forEach(tracker => tracker.stopTracking());
        this.actionTreePatchTrackersByModelId.clear();
    }

    public startTrackingAnimation(animation: AnimationAssetModel) {
        this.animationPatchTracker.startTracking(
            animation,
            (patch, inversePatch) => {
                undoableAnimationEditorSubmitChanges(animation, patch, inversePatch);
            }
        );
    }

    public submitAnimationChanges(id: number, patches: AugmentedPatch[], inversePatches: AugmentedPatch[], isUndoOrRedo: boolean) {
        if (!isUndoOrRedo && ((patches.length > 1) || (inversePatches.length > 1))) {
            console.error("Currently, multiple patches/inversePatches are only allowed when undoing/redoing. Please report this to Tobias.", { id, patches, inversePatches });
            throw new Error("Currently, multiple patches/inversePatches are only allowed when undoing/redoing. Please report this to Tobias.");
        }

        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("submitAnimationChanges", id, patches, inversePatches, autoResolveRejectCallback(resolve, reject));
        });
    }

    public stopTrackingAnimation() {
        this.animationPatchTracker.stopTracking();
    }

    public log(logLevel: LogLevel, message: any, meta?: any) {
        try {
            if (meta instanceof Error) {
                meta = serializeError(meta);
            }
            this.socket.emit("log", logLevel, message, meta);
        } catch (e) {
            errorStore.addErrorFromErrorObject(e);
        }
    }

}

export enum LoadMapResult {
    Loading,
    AlreadyLoaded,
    DoesNotExist,
}

export const editorClient = new EditorClient();

if (module.hot) {
    module.hot.dispose(data => {
        editorClient.disconnect();
        data.hotReloadData = editorClient.getHotReloadData();
    });

    if (module.hot.data) {
        editorClient.integrateHotReloadData(module.hot.data.hotReloadData);
        editorClient.connect();
    }
}
