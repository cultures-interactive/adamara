import { makeAutoObservable } from "mobx";
import { defaultComplexitySetting, EditorComplexity } from "../../shared/definitions/other/EditorComplexity";
import { getAllNumberEnumValues } from "../../shared/helper/generalHelpers";
import { getURLParameterNumber } from "../helper/generalHelpers";
import { LocalStorageObjectBoolean, LocalStorageObjectNumber } from "../integration/localStorage";
import { userStore } from "./UserStore";

export const allEditorComplexities = getAllNumberEnumValues<EditorComplexity>(EditorComplexity);

const localStorageEditorComplexity = new LocalStorageObjectNumber("editorComplexity", defaultComplexitySetting);
const localStorageShowDebugInfo = new LocalStorageObjectBoolean("showDebugInfo", false);
const localStorageShowPerformanceInfo = new LocalStorageObjectBoolean("showPerformanceInfo", false);
const localStorageShowUndoHistoryDebug = new LocalStorageObjectBoolean("showUndoHistoryDebug", false);

export class LocalSettingsStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });

        this.editorComplexity = getURLParameterNumber("complexity", localStorageEditorComplexity.get()) as EditorComplexity;
        if (!allEditorComplexities.includes(this.editorComplexity)) {
            this.editorComplexity = defaultComplexitySetting;
        }
        localStorageEditorComplexity.set(this.editorComplexity);
    }

    public fullscreen: boolean = false;
    public editorComplexity: EditorComplexity;

    public settingShowDebugInfo: boolean = localStorageShowDebugInfo.get();
    public settingShowPerformanceInfo: boolean = localStorageShowPerformanceInfo.get();
    public settingShowUndoHistoryDebug = localStorageShowUndoHistoryDebug.get();
    public actionTreeValidationEnabled: boolean;

    public get isProductionEditor() {
        return this.editorComplexity === EditorComplexity.Production;
    }

    public setEditorComplexity(value: EditorComplexity) {
        this.editorComplexity = value;
        localStorageEditorComplexity.set(value);
    }

    public get showDebugInfo() {
        if (!userStore.shouldShowAdvancedOptions)
            return false;

        return this.settingShowDebugInfo;
    }

    public get showPerformanceInfo() {
        if (!userStore.shouldShowAdvancedOptions)
            return false;

        return this.settingShowPerformanceInfo;
    }

    public get showUndoHistoryDebug() {
        if (!userStore.shouldShowAdvancedOptions)
            return false;

        return this.settingShowUndoHistoryDebug;
    }

    public toggleActionTreeValidationEnabled() {
        this.actionTreeValidationEnabled = !this.actionTreeValidationEnabled;
    }

    public setActionTreeValidationEnabled(enabled: boolean) {
        this.actionTreeValidationEnabled = enabled;
    }

    public toggleShowDebugInfoSetting() {
        this.settingShowDebugInfo = !this.settingShowDebugInfo;
        localStorageShowDebugInfo.set(this.settingShowDebugInfo);
    }

    public toggleShowPerformanceInfoSetting() {
        this.settingShowPerformanceInfo = !this.settingShowPerformanceInfo;
        localStorageShowPerformanceInfo.set(this.settingShowPerformanceInfo);
    }

    public toggleShowUndoHistoryDebug() {
        this.settingShowUndoHistoryDebug = !this.settingShowUndoHistoryDebug;
        localStorageShowUndoHistoryDebug.set(this.settingShowUndoHistoryDebug);
    }

    public toggleFullscreen() {
        this.fullscreen = !this.fullscreen;
        if (this.fullscreen) {
            document.body.requestFullscreen().catch(e => console.error(e));
        } else {
            document.exitFullscreen().catch(e => console.error(e));
        }
    }
}

export const localSettingsStore = new LocalSettingsStore();