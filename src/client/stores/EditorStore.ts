import { makeAutoObservable } from "mobx";
import { LocalStorageObjectString } from "../integration/localStorage";
import { ErrorType } from "./editor/ErrorNotification";
import { sharedStore } from "./SharedStore";
import { errorStore } from "./ErrorStore";
import { imageStore } from "./ImageStore";
import { ReadonlyEditorModule } from "../../shared/workshop/ModuleModel";
import { userStore } from "./UserStore";

const localStorageUsername = new LocalStorageObjectString("Username", "");

export enum ConnectionStatus {
    Connecting,
    Connected,
    Disconnected
}

export class EditorStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public serverWasShutDown: boolean;
    public reloadNecessaryReasonTranslationKey: string;

    public connectionStatus: ConnectionStatus = ConnectionStatus.Disconnected;

    public userId: number;
    public username: string = localStorageUsername.get();
    public isInitialized: boolean = false;
    public startedInitialization: boolean = false;

    public sessionModule: ReadonlyEditorModule;

    private tileImageLoadingPercentage = 0;

    public initializationPercentage: number = 0;

    public get isConnectedAndReady() {
        return this.isConnected && this.isInitialized && sharedStore.isInitialized && imageStore.completelyLoaded;
    }

    public get isConnected() {
        return this.connectionStatus === ConnectionStatus.Connected;
    }

    public setSessionModule(module: ReadonlyEditorModule) {
        this.sessionModule = module;
    }

    public get sessionModuleId() {
        return this.sessionModule?.id;
    }

    public setServerWasUpdatedReloadNecessary() {
        this.reloadNecessaryReasonTranslationKey = /*t*/"editor.reload_necessary_server_was_updated";
    }

    public setServerWasShutDown() {
        this.serverWasShutDown = true;
    }

    public setInconsistentStateReloadNecessary() {
        this.reloadNecessaryReasonTranslationKey = /*t*/"editor.reload_necessary_inconsistent_state";
    }

    public get tileImageLoadingPercentageInt100() {
        return Math.floor(this.tileImageLoadingPercentage * 100);
    }

    public setTileImageLoadingPercentage(value: number) {
        this.tileImageLoadingPercentage = value;
    }

    public setInitializationPercentage(value: number) {
        this.initializationPercentage = value;
    }

    public setStartedInitialization() {
        this.startedInitialization = true;
    }

    public setInitialized() {
        this.initializationPercentage = 1;
        this.isInitialized = true;
    }

    public setUserId(userId: number) {
        this.userId = userId;
    }

    public setConnectionStatus(status: ConnectionStatus) {
        this.connectionStatus = status;

        if (status === ConnectionStatus.Connected) {
            errorStore.clearErrorsOfType(ErrorType.SocketIOConnection);
        }
    }

    public setDisconnected() {
        this.setConnectionStatus(ConnectionStatus.Disconnected);
        this.userId = null;
        this.startedInitialization = false;
        this.isInitialized = false;
        this.initializationPercentage = 0;
        this.sessionModule = null;
    }

    public setUsername(username: string) {
        this.username = username;
        localStorageUsername.set(username);
    }

    public get isMainGameEditor(): boolean {
        return !this.sessionModule && userStore.mayOpenMainGameEditor;
    }

    public get isModuleEditor(): boolean {
        return !!this.sessionModule;
    }
}

export const editorStore = new EditorStore();