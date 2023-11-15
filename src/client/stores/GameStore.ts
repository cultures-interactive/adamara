import { makeAutoObservable, observable, runInAction } from "mobx";
import { MapState } from "./MapState";
import { LocalStorageObjectBoolean } from "../integration/localStorage";
import { GameEngine, LoadMapCallback, MovePlayerCallback } from "../gameengine/GameEngine";
import { GameStateModel } from "../gameengine/GameStateModel";
import { CharacterConfigurationModel } from "../../shared/resources/CharacterConfigurationModel";
import { CharacterEditorStore } from "./CharacterEditorStore";
import { CharacterDefaultName } from "../canvas/game/character/characterAnimationHelper";
import { Gender } from "../../shared/definitions/other/Gender";
import { DamageInAreaVisualManager } from "../canvas/game/map/DamageInAreaVisualManager";
import { DebugStartActionModel } from "../../shared/action/ActionModel";
import { DynamicMapElementMapMarkerModel } from "../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel";
import { GameDesignVariablesModel } from "../../shared/game/GameDesignVariablesModel";
import { editorClient } from "../communication/EditorClient";
import { LogEntry } from "./LogEntry";
import { Camera } from "../canvas/game/camera/Camera";
import { AnimationSelectionStore } from "./AnimationSelectionStore";
import i18n from "../integration/i18n";
import { sharedStore } from "./SharedStore";
import { errorStore } from "./ErrorStore";
import { Player } from "../canvas/game/character/Player";
import { SoundSource } from "../canvas/game/controller/SoundActionHelper";
import { setSharedCurrentLanguageKeyCallback } from "../../shared/data/dataAccess";
import { addSentryGameLogBreadcrumb } from "../helper/sentryHelpers";

const localStorageAccessibilityOptions = new LocalStorageObjectBoolean("accessibilityOptions", false);

export enum MapLoadingState {
    NotLoading,
    LoadingCachedMap,
    LoadingMapFromServer
}

export class GameStore {
    public blockSharedActionTrees: boolean;

    public languageKey: string;
    public accessibilityOptions = localStorageAccessibilityOptions.get();
    public mapState = new MapState();
    public gameEngine: GameEngine;

    public characterEditorStore = new CharacterEditorStore(false);
    public character: CharacterConfigurationModel;

    // For the player, the name is saved here and not in character
    // because it should not be localized
    public playerName: string = CharacterDefaultName;

    public playerGender: Gender = Gender.Neutral;

    public gameDesignVariables: GameDesignVariablesModel = new GameDesignVariablesModel({});

    public debugStartNodeModelId: string = null;
    public debugStartMarker: DynamicMapElementMapMarkerModel;
    public debugStartMarkerMapId: number;

    public gameLog = new Array<LogEntry>();
    public gameLogChangeCounter = 0;
    public gameLogLimit = 100;
    public debugLogAndTriggerAutoRefresh = true;

    public selectedStartMap: number = null;

    public currentCamera: Camera;
    public playerCamera: Camera;
    public cameraIsAnimating = false;

    public cutSceneAnimationStore: AnimationSelectionStore;

    public mapLoadingState: MapLoadingState;

    public activeSoundSources = new Array<SoundSource>();

    public mapOffsetX: number;
    public mapOffsetY: number;
    public mapScale: number;
    public taskMarkers: Array<TaskMarkerColorPosition> = observable.array();

    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public get gameInProgress() {
        return Boolean(this.gameEngine);
    }

    public get hasStartMap() {
        return !!this.loadStartMapId;
    }

    public get loadStartMapId() {
        return this.selectedStartMap;
    }

    public setSelectedStartMap(mapId: number) {
        this.selectedStartMap = mapId;
    }

    public setCutSceneAnimationStore(store: AnimationSelectionStore) {
        this.cutSceneAnimationStore = store;
    }

    public clearSelectedStartMap() {
        this.setSelectedStartMap(0);
    }

    public setLanguageKey(languageKey: string) {
        this.languageKey = languageKey;
    }

    public setPlayerCharacter(character: CharacterConfigurationModel) {
        this.character = character;
    }

    public setPlayerName(playerName: string) {
        this.playerName = playerName;
    }

    public setPlayerGender(gender: Gender) {
        this.playerGender = gender;
    }

    public setGameDesignVariables(variables: GameDesignVariablesModel) {
        if (this.gameDesignVariables === variables)
            return;

        if (this.gameDesignVariables)
            editorClient.stopTrackingGameDesignVariables();

        this.gameDesignVariables = variables;

        if (this.gameDesignVariables)
            editorClient.startTrackingGameDesignVariables();
    }

    public setDebugStartNodeModelId(debugStartNodeModelId: string) {
        if (this.debugStartNodeModelId === debugStartNodeModelId) {
            this.debugStartNodeModelId = null;
            return;
        }
        this.debugStartNodeModelId = debugStartNodeModelId;
    }

    public setDebugStartMarker(newStartMarker: DynamicMapElementMapMarkerModel, mapId: number) {
        this.debugStartMarker = newStartMarker;
        this.debugStartMarkerMapId = mapId;
    }

    public setCameraIsAnimating(isAnimating: boolean) {
        this.cameraIsAnimating = isAnimating;
    }

    public toggleAccessibilityOptions() {
        this.accessibilityOptions = !this.accessibilityOptions;
        localStorageAccessibilityOptions.set(this.accessibilityOptions);
    }

    public startGame(
        startMapId: number,
        loadMapCallback: LoadMapCallback,
        movePlayerCallback: MovePlayerCallback,
        onPlayerDamaged: () => void,
        damageInAreaVisualManager: DamageInAreaVisualManager,
        player: Player
    ) {
        runInAction(() => {
            this.blockSharedActionTrees = true;

            const gameState = new GameStateModel({ currentMap: startMapId });
            const { mainGameRootActionTree, subTrees } = sharedStore;
            this.gameEngine = new GameEngine(mainGameRootActionTree, subTrees, gameState, loadMapCallback, movePlayerCallback, this.addErrorFromErrorObject.bind(this), onPlayerDamaged, damageInAreaVisualManager, player);
            this.addLog(LogEntry.byStartedGame());

            this.gameEngine.start();
        });
    }

    public addErrorFromErrorObject(error: Error) {
        // This might later be separated from errorStore, but for now, let's just use our regular errorStore mechanism to display errors
        errorStore.addErrorFromErrorObject(error);
    }

    public get isLoadingMap() {
        return this.mapLoadingState !== MapLoadingState.NotLoading;
    }

    public setMapLoadingState(value: MapLoadingState) {
        this.mapLoadingState = value;
    }

    public disposeCurrentData() {
        this.cameraIsAnimating = false;
        this.setMapLoadingState(MapLoadingState.NotLoading);
        this.setCutSceneAnimationStore(null);
        this.disposeGameEngine();
        this.blockSharedActionTrees = false;
    }

    public disposeGameEngine() {
        this.gameEngine?.dispose();
        this.gameEngine = null;
    }

    public addLog(entry: LogEntry) {
        addSentryGameLogBreadcrumb(entry);

        if (this.gameLogLimit > -1 && this.gameLog.length >= this.gameLogLimit)
            this.gameLog.splice(0, 1);

        this.gameLog.push(entry);
        this.gameLogChangeCounter++;
    }

    public setGameLogLimit(limit: number) {
        this.gameLogLimit = limit;
        if ((this.gameLogLimit > -1) && (this.gameLog.length > limit)) {
            this.gameLog.splice(0, this.gameLog.length - limit);
            this.gameLogChangeCounter++;
        }
    }

    public clearLog() {
        if (this.gameLog.length === 0)
            return;

        this.gameLog.length = 0;
        this.gameLogChangeCounter++;
    }

    public get gameLogLength() {
        return this.gameLog.length;
    }

    public toggleDebugLogAndTriggerAutoRefresh() {
        this.debugLogAndTriggerAutoRefresh = !this.debugLogAndTriggerAutoRefresh;
    }

    public initPlayerCamera(camera: Camera) {
        this.playerCamera = camera;
        this.enablePlayerCamera();
    }

    public enablePlayerCamera() {
        this.currentCamera = this.playerCamera;
    }

    public setCurrentCamera(camera: Camera) {
        this.currentCamera = camera;
    }

    public addSoundSource(soundSource: SoundSource) {
        this.activeSoundSources.push(soundSource);
    }

    public getSoundSourceByIndex(index: number): SoundSource {
        return this.activeSoundSources[index];
    }

    public removeSoundSourceByIndex(index: number) {
        this.activeSoundSources.splice(index, 1);
    }

    public removeSoundSourceByActionId(actionId: string) {
        this.activeSoundSources = this.activeSoundSources.filter(a => a.actionId != actionId);
    }

    public getSoundSourceCount(): number {
        return this.activeSoundSources.length;
    }

    public updateFromCurrentCamera() {
        this.mapOffsetX = this.currentCamera.getX();
        this.mapOffsetY = this.currentCamera.getY();
        this.mapScale = this.currentCamera.getZoom();
    }
}

export class TaskMarkerColorPosition {
    public x: number;
    public y: number;
    public color: string;

    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }
}

export const gameStore = new GameStore();

i18n.on("initialized", () => gameStore.setLanguageKey(i18n.language));
i18n.on("languageChanged", () => gameStore.setLanguageKey(i18n.language));

setSharedCurrentLanguageKeyCallback(() => gameStore.languageKey);