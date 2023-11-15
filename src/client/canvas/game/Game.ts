///<reference types="webpack-env" />
import { Container, DisplayObject, InteractionEvent, Point, settings } from "pixi.js";
import { combatStore, Enemy } from "../../stores/CombatStore";
import { gameCanvasSize, gameConstants } from "../../data/gameConstants";
import { calcCanvasCenteredPosition, calcDefaultZoom, getEventMouseButton, getInteractionManagerFromApplication, isTouchEvent, MouseButton, tileToWorldPositionX, tileToWorldPositionY } from "../../helper/pixiHelpers";
import { MapZoomController } from "../shared/controller/MapZoomController";
import { AppContext, PixiApp } from "../shared/PixiApp";
import { CombatOverlayView } from "./combat/CombatOverlayView";
import { GameMapView } from "./map/GameMapView";
import { Player } from "./character/Player";
import { Group, Layer } from "@pixi/layers";
import { HealthBarView } from "./combat/HealthBarView";
import { autorun, IReactionDisposer, runInAction } from "mobx";
import { Character } from "./character/Character";
import { KeyInputController } from "./controller/KeyInputController";
import { ReadonlyMapData } from "../../../shared/game/MapDataModel";
import { LoadedMap } from "../../gameengine/LoadedMap";
import { delay, shuffle, wait } from "../../../shared/helper/generalHelpers";
import { GameNpcView } from "./map/GameNpcView";
import { DynamicMapElementAreaTriggerInterface } from "../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { GameInteractionTriggerIcon } from "./map/GameInteractionTriggerIcon";
import { GameInteractionTrigger } from "./map/GameInteractionTrigger";
import { doesTilePositionEqual, TilePosition } from "../../../shared/definitions/other/TilePosition";
import { PositionInterface, PositionModel, ReadonlyPosition } from "../../../shared/game/PositionModel";
import { wrapArraySet, wrapIterator } from "../../../shared/helper/IterableIteratorWrapper";
import { resolvePotentialMapElementTreeParameter } from "../../helper/treeParameterHelpers";
import { gameGetMap } from "../../communication/api";
import { DamageInAreaVisualManager } from "./map/DamageInAreaVisualManager";
import { getCharacterNameForCurrentLanguage } from "../../helper/displayHelpers";
import { MovePlayerActionModel } from "../../../shared/action/ActionModel";
import { LogEntry } from "../../stores/LogEntry";
import { MapStateCamera } from "./camera/MapStateCamera";
import { AnimatedMoveCamera } from "./camera/AnimatedMoveCamera";
import { CutSceneController } from "./controller/CutSceneController";
import { FadeGraphics } from "./camera/FadeGraphics";
import { gameStore, MapLoadingState, TaskMarkerColorPosition } from "../../stores/GameStore";
import { sharedStore } from "../../stores/SharedStore";
import { errorStore } from "../../stores/ErrorStore";
import { SoundActionHelper } from "./controller/SoundActionHelper";
import { notificationController } from "../../components/game/ui components/NotificationController";
import { repeatCallUntilSuccess } from "../../helper/asyncHelpers";
import { addSentryDebugBreadcrumb } from "../../helper/sentryHelpers";
import { soundCache } from "../../stores/SoundCache";
import { UiSounds } from "./sound/UiSounds";

const directionalOffsets = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 }
];

class Game extends PixiApp {

    private readonly mapViewContainer: Container;
    private readonly interactionTriggerOverlay: Container;
    private readonly characterOverlayContainer: Container;
    private mapView: GameMapView;
    private readonly combatView: CombatOverlayView;
    private readonly overlayUI: Container;
    private readonly fadeGraphics = new FadeGraphics();
    private readonly emergencyLightGraphics = new FadeGraphics(gameConstants.emergencyLightColor);

    private readonly damageInAreaVisualManager: DamageInAreaVisualManager;

    private readonly player: Player;
    private readonly playerHealthUI: HealthBarView;

    private gameMapZoomController: MapZoomController;
    private readonly keyInputController: KeyInputController;

    private didPinch: boolean;

    private readonly textGroup: Group;

    private walkingToInteractionTrigger: GameInteractionTrigger;

    private loadedMaps: Map<number, ReadonlyMapData> = new Map();

    private mapRelatedReactionDisposers = new Array<IReactionDisposer>();

    private previousMovePlayerPromise = Promise.resolve();

    private cutSceneController: CutSceneController;

    public constructor() {
        super("Game", AppContext.Main, {
            ...gameCanvasSize,
            manualTextureGarbageCollectionMode: true
        });
        const { app } = this;

        const { stage } = app;

        this.textGroup = new Group(1, false);
        stage.addChild(new Layer(this.textGroup));

        this.mapViewContainer = new Container();
        stage.addChild(this.mapViewContainer);

        stage.addChild(this.emergencyLightGraphics);

        this.characterOverlayContainer = new Container();
        this.mapViewContainer.addChild(this.characterOverlayContainer);

        this.interactionTriggerOverlay = new Container();
        this.mapViewContainer.addChild(this.interactionTriggerOverlay);

        this.player = new Player(this.characterOverlayContainer);
        this.player.characterMovementControllerEvents.on("enterTile", this.onPlayerEnterTile, this);
        this.player.characterMovementControllerEvents.on("leaveTile", this.onPlayerLeaveTile, this);
        this.player.characterMovementControllerEvents.on("startPath", this.onPlayerStartPath, this);
        this.player.characterMovementControllerEvents.on("enterTriggerObject", this.onPlayerEnterTrigger, this);
        this.player.characterMovementControllerEvents.on("leaveTriggerObject", this.onPlayerLeaveTrigger, this);
        this.player.characterMovementControllerEvents.on("endPath", this.onPlayerEndPath, this);
        this.player.characterMovementControllerEvents.on("pathAnimationUpdate", this.onPlayerMoved, this);
        this.player.characterMovementControllerEvents.on("positionSetDirectly", this.onPlayerMoved, this);

        gameStore.initPlayerCamera(new MapStateCamera(gameStore.mapState));
        this.centerPlayerCameraOverPlayer();

        this.playerHealthUI = new HealthBarView(0.8, true);
        this.playerHealthUI.position.set(16, gameCanvasSize.height - 69);
        stage.addChild(this.playerHealthUI);
        this.keyInputController = new KeyInputController();
        this.keyInputController.onMove = (deltaX, deltaY) => {
            if (!gameStore.gameEngine.playerCanMove())
                return;

            const targetPosition = this.mapView.pathfinder.pickTarget(this.player.baseTileX + deltaX, this.player.baseTileY + deltaY);
            this.player.move(targetPosition);
        };

        this.combatView = new CombatOverlayView(this.player);
        this.combatView.visible = false;
        this.app.stage.addChild(this.combatView);

        this.damageInAreaVisualManager = new DamageInAreaVisualManager(
            visual => this.mapView.addChildToContentContainer(visual),
            triggerId => this.mapView.mapData.getAllAreaTriggersById(triggerId).map(trigger => trigger.position)
        );

        stage.addChild(this.fadeGraphics);

        this.overlayUI = new Container();
        this.overlayUI.addChild(this.fadeGraphics);
        stage.addChild(this.overlayUI);

        this.cutSceneController = new CutSceneController(
            gameCanvasSize.width * 0.5,
            gameCanvasSize.height * 0.4,
            gameCanvasSize.width * 0.6,
            gameCanvasSize.height * 0.90,
            this.overlayUI);

        this.gameMapZoomController = new MapZoomController(
            gameConstants.map.minZoomGame,
            gameStore.mapState,
            () => gameStore.currentCamera === gameStore.playerCamera
        );

        this.reactionDisposers.push(autorun(this.observeIfFightShouldStart.bind(this)));
        this.reactionDisposers.push(autorun(this.observePlayerHealth.bind(this)));
        this.reactionDisposers.push(autorun(this.playerAnimationRefresher.bind(this)));
        this.reactionDisposers.push(autorun(this.cutSceneController.observeCutSceneAnimation.bind(this.cutSceneController)));
        this.reactionDisposers.push(autorun(this.observeUi.bind(this)));

        const interactionManager = getInteractionManagerFromApplication(this.app);
        interactionManager.on('pointerdown', this.onPointerDown, this);
        interactionManager.on('pointerup', this.onPointerUp, this);
        interactionManager.on('pointermove', this.onPointerMove, this);
        this.app.view.onwheel = this.onWheel.bind(this);

        app.ticker.add(this.update, this);

        this.defaultZoom();

        gameStore.startGame(
            gameStore.loadStartMapId,
            this.loadAndStartMap.bind(this),
            this.movePlayer.bind(this),
            () => this.player.playSlashEffect(true),
            this.damageInAreaVisualManager,
            this.player
        );
    }

    public dispose() {
        runInAction(() => {
            this.disposeMap();

            this.keyInputController.dispose();

            this.app.view.onwheel = undefined;

            this.app.ticker.remove(this.update, this);

            combatStore.clear();
            this.damageInAreaVisualManager.destroy();

            this.mapRelatedReactionDisposers.forEach(disposer => disposer());
            this.mapRelatedReactionDisposers.length = 0;

            gameStore.disposeCurrentData();
            notificationController.disposeCurrentData();

            super.dispose();
        });
    }

    /**
     * Loads the map using the {@link GameClient} and starts it afterwards.
     * @param id The id of the map the player should be moved to.
     * @param targetMapMarkerModelId The $modelId of the target map marker for the player spawn position.
     * @param transitionTime The time for the transition during which transition screen is shown.
     */
    public movePlayer(id: number, targetMapMarkerModelId: string, transitionTime: number, teleport: boolean, actionModelId: string) {
        // Execute this call to movePlayerInternal after the previous call to movePlayerInternal finished.
        this.previousMovePlayerPromise = this.previousMovePlayerPromise
            .then(() => this.movePlayerInternal(id, targetMapMarkerModelId, transitionTime, teleport, actionModelId))
            .catch(gameStore.addErrorFromErrorObject);
    }

    private async movePlayerInternal(id: number, targetMapMarkerModelId: string, transitionTimeS: number, teleport: boolean, actionModelId: string) {
        if (this.wasDisposed)
            return;

        // check if player should be moved to another map. if yes, load that map first.
        if (id && (!this.mapView || id !== gameStore.gameEngine?.gameState?.currentMap)) {
            const startedLoadingAt = Date.now();
            await this.loadAndStartMap(id, targetMapMarkerModelId);

            if (this.wasDisposed)
                return;

            const elapsedTimeWhileLoadingS = (Date.now() - startedLoadingAt) / 1000;
            transitionTimeS -= elapsedTimeWhileLoadingS;

            gameStore.gameEngine.gameState.setCurrentMap(id);
        }

        // we stay on the current map and do not need to load another one

        gameStore.gameEngine.gameState.waitingForCharacterToReachTileActions.add(actionModelId);

        const targetMapMarker = targetMapMarkerModelId ? this.mapView.mapData.findMapMarkerByModelId(targetMapMarkerModelId) : null;
        const targetPosition = targetMapMarker?.position;

        if (teleport) {
            // teleport with a black screen (will show transition picture in the future)
            this.mapView.visible = false;

            if (transitionTimeS > 0) {
                await delay(transitionTimeS * 1000);

                if (this.wasDisposed)
                    return;
            }

            gameStore.gameEngine.clearPlayerIsInsideTriggersList();

            if (targetPosition) {
                this.player.spawnAt(targetPosition);
                this.mapView.visible = true;
                this.informGameEngine(this.player);
            } else {
                this.player.resetToSpawnPosition();
                this.mapView.visible = true;
                this.endMovePlayerWithoutTargetPosition(id, targetMapMarkerModelId, actionModelId);
            }
        } else if (targetPosition) {
            if (doesTilePositionEqual(this.player.baseTilePosition, targetPosition)) {
                // player already at the target position
                this.informGameEngine(this.player);
            } else {
                // let the player actually move
                const playerIsMoving = this.player.move(targetPosition, true); // the transition time should maybe control the player speed
                if (!playerIsMoving) {
                    // Target not reachable - pretend that the player reached is to unblock the game
                    const markersAtTargetPosition = this.mapView.mapData.getMapMarkersAtPositionXYPlane(targetPosition.x, targetPosition.y, targetPosition.plane);
                    gameStore.gameEngine.progressWhenCharacterReachedTile("Player", markersAtTargetPosition);
                }
            }
        } else {
            this.endMovePlayerWithoutTargetPosition(id, targetMapMarkerModelId, actionModelId);
        }
    }

    private endMovePlayerWithoutTargetPosition(mapId: number, targetMapMarkerModelId: string, actionModelId: string) {
        if (targetMapMarkerModelId) {
            console.warn(`movePlayer didn't find the target map marker with the id '${targetMapMarkerModelId}' on map #${mapId}.`);
        } else {
            console.warn(`movePlayer to map #${mapId} had no target map marker. That's not valid and should be fixed.`);
        }

        // If we don't have a target position, we assume we have already arrived.
        gameStore.gameEngine.gameState.waitingForCharacterToReachTileActions.delete(actionModelId);
        const action = gameStore.gameEngine.getCachedActionNode<MovePlayerActionModel>(actionModelId);
        gameStore.gameEngine.executeActions(action.nextActions, action);
    }

    /**
     * Loads the map using the {@link GameClient} and starts it afterwards.
     * @param id The id of the map to load.
     * @param targetMapMarkerModelId The $modelId of the target map marker for the player spawn position.
     */
    public async loadAndStartMap(id: number, targetMapMarkerModelId: string, startPositionOverride?: PositionModel) {
        addSentryDebugBreadcrumb(`loadAndStartMap(${id})`);

        try {
            if (!id) return;

            if (this.mapView?.mapData)
                this.loadedMaps.set(gameStore.gameEngine.gameState.currentMap, this.mapView.mapData);

            this.walkingToInteractionTrigger = null;

            let mapData = this.loadedMaps.get(id);
            gameStore.setMapLoadingState(mapData ? MapLoadingState.LoadingCachedMap : MapLoadingState.LoadingMapFromServer);

            this.disposeMap();

            if (!mapData) {
                const serverMapData = await repeatCallUntilSuccess(
                    () => gameGetMap(id),
                    () => this.wasDisposed,
                    errorStore.addErrorFromErrorObject
                );
                if (this.wasDisposed)
                    return;

                mapData = new ReadonlyMapData(serverMapData, sharedStore.getTileAsset);
            } else {
                // NOTE(Lena): Needed so that changing to map from loadedMaps gives other objects a chance to update correctly
                await wait(0);
                if (this.wasDisposed)
                    return;
            }

            await this.startMap(mapData, targetMapMarkerModelId, startPositionOverride);
            if (this.wasDisposed)
                return;

            gameStore.setMapLoadingState(MapLoadingState.NotLoading);
            this.mapView.visible = true;
            this.overlayUI.visible = true;
            this.informGameEngine(this.player);
        } catch (e) {
            addSentryDebugBreadcrumb(`error during loadAndStartMap(${id})`);

            // Should be fed back to the user if we have a solution for it.
            console.log("Error while loading map with the id " + id, e);
            throw e;
        }

        addSentryDebugBreadcrumb(`finished loadAndStartMap(${id})`);
    }

    /**
     * Starts a map. Disposes old map data. Tries to find a start {@link PositionModel}
     * for the player.
     * @param map The map to start.
     * @param mapMarkerModelId The modelId of a map marker the player should start at, or null.
     */
    public async startMap(map: ReadonlyMapData, mapMarkerModelId?: string, startPositionOverride?: PositionModel) {
        this.triggerManualTextureGarbageCollection();

        this.mapView = new GameMapView(this.appReference, map, this.characterOverlayContainer, this.interactionTriggerOverlay, () => this.wasDisposed);

        this.mapView.visible = false;
        this.overlayUI.visible = false;
        this.mapViewContainer.addChildAt(this.mapView, 0);
        this.player.onMapLoaded(this.mapView);

        this.mapView.addChildToContentContainer(this.player);

        gameStore.gameEngine.onMapWasLoaded();

        this.combatView.map = this.mapView;

        const startPosition = startPositionOverride ? startPositionOverride : map.findStartPosition(mapMarkerModelId, gameConstants.mapStartMarker);
        this.player.spawnAt(startPosition);

        // TODO tw: Trigger area triggers on map load. It would be better to do this in this.player.spawnAt (so it'll also happen on e.g. teleport)
        const triggers = this.mapView.mapData.getAllAreaTriggersAtPositionXYPlane(this.player.baseTileX, this.player.baseTileY, this.player.baseTilePlane);
        triggers.map(trigger => gameStore.gameEngine.handleAreaTrigger(trigger.id, true));

        gameStore.gameEngine.loadedMap = new LoadedMap(
            this.mapView.mapData,
            this.mapView.npcViewsArray,
            this.mapView.mapData.mapMarkers,
            this.mapView.animationElementViewsArray,
            this.mapView.interactionTriggersArray,
            this.mapView.mapData.areaTriggers
        );

        for (const npc of gameStore.gameEngine.loadedMap.npcs) {
            npc.onMapLoaded(this.mapView);
            npc.characterMovementControllerEvents.on("endPath", this.onNpcEndPath, this);
            npc.characterMovementControllerEvents.on("pathAnimationUpdate", this.onNpcMoved, this);
            npc.characterMovementControllerEvents.on("positionSetDirectly", this.onNpcMoved, this);
            npc.viewAreaControllerEvents.on("viewAreaTriggerEnter", this.onViewAreaTriggerEnter, this);
            npc.viewAreaControllerEvents.on("viewAreaTriggerLeave", this.onViewAreaTriggerLeave, this);

            if (gameStore.gameEngine.gameState.defeatedEnemies.has(npc.$modelId)) {
                npc.hide();
            }
        }

        const { backgroundSoundFilePath } = map.properties;
        if (backgroundSoundFilePath) {
            await SoundActionHelper.startSoundSource(backgroundSoundFilePath);
            if (this.wasDisposed)
                return;
        }

        const animationElementsLoading = gameStore.gameEngine.loadedMap.animationElements.map(ae => ae.loadingPromise);
        await Promise.all(animationElementsLoading);
        if (this.wasDisposed)
            return;

        const npcsLoading = gameStore.gameEngine.loadedMap.npcs.map(npc => npc.loadingPromise);
        await Promise.all(npcsLoading);
        if (this.wasDisposed)
            return;

        if (this.mapRelatedReactionDisposers.length > 0) {
            console.error("this.mapRelatedReactionDisposers.length should be 0");
        }

        this.mapRelatedReactionDisposers.push(autorun(this.taskMarkerRefresher.bind(this)));

        gameStore.addLog(LogEntry.byLoadedMap(map));
    }

    private disposeMap() {
        if (!this.mapView)
            return;

        SoundActionHelper.endAllActiveSounds();
        gameStore.gameEngine.clearPlayerIsInsideTriggersList();
        this.damageInAreaVisualManager.finishAll();
        this.mapViewContainer.removeChild(this.mapView);
        this.player.onMapUnloaded();

        if (gameStore.gameEngine.loadedMap) {
            for (const npc of gameStore.gameEngine.loadedMap.npcs) {
                npc.onMapUnloaded();
            }
        }

        // Detach the player from the mapView so it doesn't get destroyed
        this.player.parent?.removeChild(this.player);
        this.player.detachFromSpatialGrid();
        this.player.stop(false);

        // Destroy the mapView and all its references and contents
        this.mapView.destroy({ children: true });

        this.mapRelatedReactionDisposers.forEach(disposer => disposer());
        this.mapRelatedReactionDisposers.length = 0;

        this.mapView = null;
    }

    private defaultZoom() {
        gameStore.currentCamera.setX(this.mapViewContainer.position.x);
        gameStore.currentCamera.setY(this.mapViewContainer.position.y);
        gameStore.currentCamera.setZoom(calcDefaultZoom());
    }

    private update(deltaTimeTicks: number) {
        if (!this.mapView || gameStore.isLoadingMap)
            return;

        const deltaTimeS = deltaTimeTicks / settings.TARGET_FPMS / 1000;

        if (this.keyInputController)
            this.keyInputController.moveByKey();

        if (combatStore.active) {
            combatStore.reduceTimer(deltaTimeTicks);
        }

        for (const npc of gameStore.gameEngine.loadedMap.npcs) {
            npc.onTick(deltaTimeTicks);
        }

        this.player.onTick(deltaTimeTicks);

        gameStore.currentCamera.onTick();
        this.updateCamera();

        gameStore.gameEngine.update(deltaTimeS);
        this.damageInAreaVisualManager.update(deltaTimeS);
    }

    private updateCamera() {
        gameStore.currentCamera.applyTo(this.mapViewContainer);
        gameStore.updateFromCurrentCamera();
    }

    private playerAnimationRefresher() {
        this.player.applyConfiguration(gameStore.character).catch(errorStore.addErrorFromErrorObject);
    }

    private observeUi() {
        if (this.playerHealthUI) {
            this.playerHealthUI.visible = gameStore.gameEngine?.gameState.actionPropertyUIVisible;
        }
        if (this.fadeGraphics) {
            this.fadeGraphics.setOpacity(gameStore.gameEngine?.gameState.actionPropertyOverlayOpacity);
        }
        if (this.emergencyLightGraphics) {
            this.emergencyLightGraphics.setOpacity(gameStore.gameEngine?.gameState.actionPropertyEmergencyLightOverlayOpacity);
        }
    }

    private centerPlayerCameraOverPlayer() {
        const cameraPosition = calcCanvasCenteredPosition(this.player.position, gameStore.currentCamera.getZoom());
        gameStore.playerCamera.setPosition(cameraPosition);
        if (gameStore.currentCamera === gameStore.playerCamera) {
            this.updateCamera();
        }
    }

    private fireTriggersOrMovePlayer(e: InteractionEvent) {
        const { target, data } = e;
        const screenPosition = data.global;

        if (!gameStore.gameEngine.playerCanMove() || !this.mapView)
            return;

        const { x, y } = this.mapView.getTilePosition(screenPosition);

        const highestTilePlane = this.mapView.mapData.getHighestMainGroundTilePlaneForPosition(x, y);
        const tileExists = highestTilePlane !== undefined;

        if (this.handleClickedInteractionTrigger(target, tileExists, x, y, highestTilePlane))
            return;

        // We are not using an interaction trigger. Pick the actual target. This might be a virtual transition (like on stairs).
        const targetPosition = this.mapView.pathfinder.pickTarget(x, y);
        if (this.player.move(targetPosition, false, false, this.mapView.toLocal(screenPosition))) {
            soundCache.playOneOf(UiSounds.SET_WAYPOINT);
        }
    }

    private handleClickedInteractionTrigger(target: DisplayObject, validTileWasClicked: boolean, clickedTileX: number, clickedTileY: number, clickedTilePlane: number) {
        if (!(target instanceof GameInteractionTriggerIcon))
            return false;

        const { interactionTrigger } = target;

        const interactionTriggerTilePosition = interactionTrigger.tilePosition;

        /*
        // Ignore the interaction trigger if the clicked tile exists and is in front of the interactionTrigger
        if (validTileWasClicked && (
            (clickedTilePlane > interactionTriggerTilePosition.plane) ||
            (clickedTileX > interactionTriggerTilePosition.x) ||
            (clickedTileY > interactionTriggerTilePosition.y)))
            return false;
        */

        // Handle interaction if player is on interaction trigger tile already
        if (this.handleInteractionTriggerIfPlayerIsOnTile(interactionTrigger, 0))
            return true;

        // Try to walk directly on the interaction trigger tile position
        if (this.player.move(interactionTriggerTilePosition, false)) {
            soundCache.playOneOf(UiSounds.SET_WAYPOINT);
            this.walkingToInteractionTrigger = interactionTrigger;
            return true;
        }

        // Can't walk directly onto tile position? Handle interaction if player next to the interaction trigger tile already.
        if (this.handleInteractionTriggerIfPlayerIsOnTile(interactionTrigger, 1))
            return true;

        // Try to walk to the closest spot next to the target
        const closestPositionNextToTarget = this.findClosestReachableTargetNextToInteractionTrigger(interactionTriggerTilePosition);
        if (closestPositionNextToTarget && this.player.move(closestPositionNextToTarget, false)) {
            soundCache.playOneOf(UiSounds.SET_WAYPOINT);
            this.walkingToInteractionTrigger = interactionTrigger;
            return true;
        }

        return false;
    }

    /**
     * Finds the closest tile in the 4 spaces directly next to interactionTriggerPosition that is reachable
     * via pathfinding from the player's current position.
     */
    private findClosestReachableTargetNextToInteractionTrigger(interactionTriggerPosition: TilePosition) {
        const { x, y, plane } = interactionTriggerPosition;
        let closestPosition: PositionInterface;
        let distanceToClosestPosition: number;

        const playerBasePosition = this.player.copyBasePosition();

        for (const { dx, dy } of directionalOffsets) {
            const targetPositionWithOffset = new ReadonlyPosition({
                x: x + dx,
                y: y + dy,
                plane
            });

            const path = this.mapView.pathfinder.findPath(playerBasePosition, targetPositionWithOffset, false);
            if (path) {
                if (!closestPosition || (distanceToClosestPosition > path.length)) {
                    closestPosition = targetPositionWithOffset;
                    distanceToClosestPosition = path.length;
                }
            }
        }

        return closestPosition;
    }

    private taskMarkerRefresher() {
        if (!gameStore.gameEngine)
            return;

        const activeLocationTaskMarkers = this.mapView.getTaskMarkerOnCurrentMap();

        runInAction(() => {
            const count = activeLocationTaskMarkers.length;

            while (gameStore.taskMarkers.length < count) {
                gameStore.taskMarkers.push(new TaskMarkerColorPosition());
            }

            if (gameStore.taskMarkers.length > count) {
                gameStore.taskMarkers.splice(count, gameStore.taskMarkers.length - count);
            }

            let i = 0;
            for (const taskMarkerInformation of activeLocationTaskMarkers) {
                const taskMarker = gameStore.taskMarkers[i++];
                const { x, y } = taskMarkerInformation.taskMarker.position;
                taskMarker.x = tileToWorldPositionX(x, y, true);
                taskMarker.y = tileToWorldPositionY(x, y, true);
                taskMarker.color = "#" + taskMarkerInformation.color.toString(16).padStart(6, "0");
            }
        });
    }

    private onPointerDown(e: InteractionEvent) {
        this.gameMapZoomController.reset();
        this.didPinch = false;

        if (getEventMouseButton(e) !== MouseButton.LeftOrTouch || e.stopped)
            return;

        if (document.activeElement && (document.activeElement as any).blur) {
            (document.activeElement as any).blur();
        }

        e.data.originalEvent.preventDefault();
        e.stopPropagation();

        if (combatStore.active) {
            combatStore.gestureStart();
            const p = this.combatView.patternView.toLocal(e.data.global);
            combatStore.gestureInput(p);
            this.combatView.patternView.startTouchTrail(p);
            return;
        }

        if (!isTouchEvent(e)) {
            this.fireTriggersOrMovePlayer(e);
        }
    }

    private onPointerUp(e: InteractionEvent) {
        if (combatStore.active) {
            combatStore.gestureEnd();
            this.combatView.patternView.endTouchTrail();
        } else {
            if (isTouchEvent(e) && !this.didPinch) {
                this.fireTriggersOrMovePlayer(e);
            }
        }
    }

    private onPointerMove(e: InteractionEvent) {
        if (combatStore.active) {
            const p = this.combatView.patternView.toLocal(e.data.global);
            combatStore.gestureInput(p);
            this.combatView.patternView.extendTouchTrail(p);
            return;
        }

        if (this.gameMapZoomController.pinch(e, null)) {
            this.didPinch = true;
        }
    }

    private onWheel(e: WheelEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (combatStore.active)
            return;

        this.gameMapZoomController.wheelZoom(e, null);
    }

    private onNpcEndPath(character: Character) {
        // Inform the game engine that the NPC has ended its path on this tile
        this.informGameEngine(character);

        if (character.baseTileX == this.player.baseTileX && character.baseTileY == this.player.baseTileY) {
            if (!this.player.pushAway()) {
                gameStore.gameEngine.gameState.setPlayerHealth(0);
                this.observePlayerHealth();
            }
        }
    }

    /**
     * Gets called if the assigned {@link Character} enters a tile position.
     * @param character The character that enters the tile position.
     * @param tileX The tile x position.
     * @param tileY The tile y position.
     * @param tilePlane The tile plane.
     * @param isBaseTile True if it is the 'base tile' of the character.
     */
    private onPlayerEnterTile(character: Character, tileX: number, tileY: number, tilePlane: number, isBaseTile: boolean) {
        //console.log("[EVENT] On enter " + (isBaseTile ? "BASE" : "SECONDARY") + " tile.", "x: " + tileX, "y: " + tileY, "plane: " + tilePlane);
        this.informGameEngine(this.player);
    }

    /**
     * Gets called if the assigned {@link Character} leaves a tile position.
     * @param character The character that enters the tile position.
     * @param tileX The tile x position.
     * @param tileY The tile y position.
     * @param tilePlane The tile plane.
     * @param isBaseTile True if it is the 'base tile' of the character.
     */
    private onPlayerLeaveTile(character: Character, tileX: number, tileY: number, tilePlane: number, isBaseTile: boolean) {
        //console.log("[EVENT] On leave " + (isBaseTile ? "BASE" : "SECONDARY") + " tile.", "x: " + tileX, "y: " + tileY, "plane: " + tilePlane);
    }

    private onPlayerStartPath() {
        this.walkingToInteractionTrigger = null;
    }

    private onPlayerEnterTrigger(character: Character, trigger: DynamicMapElementAreaTriggerInterface) {
        const stopPlayerPath = gameStore.gameEngine.handleAreaTrigger(trigger.id, true);
        if (stopPlayerPath) {
            this.player.move(trigger.position);
        }
    }

    private onPlayerLeaveTrigger(character: Character, trigger: DynamicMapElementAreaTriggerInterface) {
        gameStore.gameEngine.handleAreaTrigger(trigger.id, false);
    }

    private onPlayerEndPath() {
        if (this.walkingToInteractionTrigger) {
            this.handleInteractionTriggerIfPlayerIsOnTile(this.walkingToInteractionTrigger, 1);
            this.walkingToInteractionTrigger = null;
        }
    }

    private onPlayerMoved() {
        // If the player has left the map during moving, jump out here
        if (!this.mapView)
            return;

        this.centerPlayerCameraOverPlayer();
        SoundActionHelper.handlePlayerMovement(this.player);

        this.mapView.npcViewsArray.forEach(npc => {
            npc.checkViewIntersections(this.player.x, this.player.y);
        });
    }

    private onNpcMoved(char: Character) {
        const npc = char as GameNpcView;
        if (npc) {
            npc.checkViewIntersections(this.player.x, this.player.y);
        }
    }

    private onViewAreaTriggerEnter(triggerName: string) {
        gameStore.gameEngine.handleAreaTrigger(triggerName, true);
    }

    private onViewAreaTriggerLeave(triggerName: string) {
        gameStore.gameEngine.handleAreaTrigger(triggerName, false);
    }

    private handleInteractionTriggerIfPlayerIsOnTile(interactionTrigger: GameInteractionTrigger, maxManhattanDistance: number) {
        const playerPosition = this.player.baseTilePosition;
        const interactionTriggerPosition = interactionTrigger.tilePosition;

        if (playerPosition.plane !== interactionTriggerPosition.plane)
            return false;

        const manhattanDistance = Math.abs(playerPosition.x - interactionTriggerPosition.x) + Math.abs(playerPosition.y - interactionTriggerPosition.y);
        if (manhattanDistance > maxManhattanDistance)
            return false;

        gameStore.gameEngine.handleInteractionTrigger(interactionTrigger.$modelId);

        return true;
    }

    private informGameEngine(character: Character) {
        const markersAtPosition = this.mapView.mapData.getMapMarkersAtPositionXYPlane(character.baseTileX, character.baseTileY, character.baseTilePlane);
        if (markersAtPosition) {
            gameStore.gameEngine.progressWhenCharacterReachedTile(character instanceof GameNpcView ? character.$modelId : "Player", markersAtPosition);
        }
    }

    private observeIfFightShouldStart() {
        const currentCombat = gameStore.gameEngine?.currentCombat();
        if (!currentCombat)
            return;

        runInAction(() => {
            this.startArenaFight();
        });
    }

    private observePlayerHealth() {
        if (!gameStore.gameEngine || !combatStore.hasConfig)
            return;

        const { playerHealth } = gameStore.gameEngine.gameState;
        if (playerHealth === 0) {
            this.resetPlayerAfterKnockOut();
        }

        this.playerHealthUI.setHealth(gameStore.gameEngine.gameState.playerHealth / combatStore.config.playerHealth);
    }

    private startArenaFight() {
        const { npcs } = gameStore.gameEngine.loadedMap;
        const { defeatedEnemies } = gameStore.gameEngine.gameState;
        const combat = gameStore.gameEngine.currentCombat();

        const uniqueEnemyModelIds = new Set(
            combat.enemies
                .map(enemyOnMapRef => resolvePotentialMapElementTreeParameter(enemyOnMapRef, "actions/EnemyOnMapValueModel", combat))
                .filter(
                    enemyOnMapRef =>
                        !!enemyOnMapRef && // resolved as a reference
                        npcs.some(npcView => npcView.$modelId === enemyOnMapRef.elementId) && // only enemies that actually exist on map
                        !wrapArraySet(defeatedEnemies).some(defeatedEnemyId => defeatedEnemyId === enemyOnMapRef.elementId) // only enemies that are not yet defeated
                ).map(enemyOnMapRef => enemyOnMapRef.elementId)
        );

        const enemyData = shuffle(
            wrapIterator(uniqueEnemyModelIds.values())
                .map(enemyModelId => {
                    const enemyOnMap = this.mapView.mapData.npcs.find(npc => npc.$modelId === enemyModelId);
                    const enemyCharacter = sharedStore.characterConfigurations.get(enemyOnMap.characterId);

                    if (!enemyCharacter) {
                        console.warn("Enemy character not found: " + getCharacterNameForCurrentLanguage(enemyOnMap.characterId));
                        return null;
                    }

                    if (!enemyCharacter.isEnemy) {
                        console.warn("Enemy character is not marked as 'isEnemy': " + getCharacterNameForCurrentLanguage(enemyOnMap.characterId));
                        return null;
                    }

                    if (!combatStore.config.enemyCombatPresets.find(preset => preset.$modelId === enemyCharacter.enemyCombatPresetModelId)) {
                        console.warn("Enemy character has no enemy combat preset: " + getCharacterNameForCurrentLanguage(enemyOnMap.characterId));
                        return null;
                    }

                    return new Enemy(enemyModelId, enemyOnMap.position.x, enemyOnMap.position.y, enemyCharacter.enemyHealth, enemyCharacter.enemyCombatPresetModelId, enemyCharacter.enemyDamage);
                }).filter(enemy => !!enemy) // only return not-null enemies
        );

        if (enemyData.length === 0) {
            gameStore.gameEngine.progressAfterCombat();
        } else {
            const enemyViews = enemyData.map(enemyData => npcs.find(npcView => npcView.$modelId === enemyData.elementId));

            const { minPosition, maxPosition } = this.player.calculateCurrentAnimationExtents(false);

            for (const enemyView of enemyViews) {
                const enemyExtents = enemyView.calculateCurrentAnimationExtents(true);
                minPosition.x = Math.min(minPosition.x, enemyExtents.minPosition.x);
                minPosition.y = Math.min(minPosition.y, enemyExtents.minPosition.y);
                maxPosition.x = Math.max(maxPosition.x, enemyExtents.maxPosition.x);
                maxPosition.y = Math.max(maxPosition.y, enemyExtents.maxPosition.y);
            }

            const uiBorderTop = 100;
            const uiBorderBottom = 150;
            const borderSide = 75;
            const width = maxPosition.x - minPosition.x;
            const height = maxPosition.y - minPosition.y;
            const exactZoom = Math.min((gameCanvasSize.width - borderSide * 2) / width, (gameCanvasSize.height - uiBorderTop - uiBorderBottom) / height);
            const zoom = Math.min(exactZoom, gameConstants.map.maxZoom);
            const centerOffsetY = (uiBorderTop - uiBorderBottom) / 2 / zoom;
            const center = calcCanvasCenteredPosition(new Point((minPosition.x + maxPosition.x) / 2, (minPosition.y + maxPosition.y) / 2 - centerOffsetY), zoom);

            const interpolationCamera = new AnimatedMoveCamera(gameStore.currentCamera.getX(),
                gameStore.currentCamera.getY(), gameStore.currentCamera.getZoom());
            interpolationCamera.setAnimationTarget(center.x, center.y, zoom, gameConstants.arenaFightZoomAnimationDurationMillis);
            interpolationCamera.startAnimation();
            gameStore.setCurrentCamera(interpolationCamera);

            this.combatView.addEnemies(enemyViews);
            this.combatView.activate();
            combatStore.start(enemyData, this.finishArenaFight.bind(this));
        }
    }

    private finishArenaFight() {
        if (gameStore.gameEngine.progressAfterCombat()) {
            this.combatView.deactivate();

            const animationCamera = new AnimatedMoveCamera(gameStore.currentCamera.getX(), gameStore.currentCamera.getY(), gameStore.currentCamera.getZoom());
            const target = calcCanvasCenteredPosition(this.player.position, gameStore.playerCamera.getZoom());
            animationCamera.setAnimationTarget(target.x, target.y, gameStore.playerCamera.getZoom(), gameConstants.arenaFightZoomAnimationDurationMillis);
            animationCamera.startAnimation(() => {
                gameStore.enablePlayerCamera();
                this.centerPlayerCameraOverPlayer();
            });
            gameStore.setCurrentCamera(animationCamera);
        }
    }

    private resetPlayerAfterKnockOut() {
        if (!this.mapView)
            return;

        this.mapView.visible = false;
        delay(1000).then(() => {
            if (this.wasDisposed)
                return;

            gameStore.gameEngine.clearPlayerIsInsideTriggersList();
            gameStore.gameEngine.gameState.resetPlayerHealth();
            this.player.resetToSpawnPosition();
            this.mapView.visible = true;
        }).catch(gameStore.addErrorFromErrorObject);
    }
}

let game: Game;

export function createGame() {
    if (game)
        return;

    game = new Game();
}

export function getGame() {
    return game;
}

export function disposeGame() {
    if (game) {
        game.dispose();
        game = null;
    }
}

if (module.hot) {
    const { data } = module.hot;
    if (data && data.parent) {
        createGame();
        game.attach(data.parent);
    }

    module.hot.dispose(data => {
        if (game) {
            data.parent = game.parentElement;
            disposeGame();
        }
    });
}
