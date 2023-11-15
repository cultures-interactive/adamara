import { ActionModel, SimpleCutSceneActionModel } from "../../shared/action/ActionModel";
import { ReadonlyMapData } from "../../shared/game/MapDataModel";
import { TFunction } from "i18next";

let runningId = 0;

export class LogEntry {
    public readonly id: number = runningId++;
    public readonly time: string;

    public useSeparator: boolean;

    public executionType: string;
    public executionEntity: string;
    public executionEntityId: string;

    public executionSourceEntity: string;
    public executionSourceId: string;

    public isWarning = false;

    public constructor() {
        this.time = Intl.DateTimeFormat("en-US", { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
    }

    public static byExecutedAction(target: ActionModel, source: ActionModel, targetActivated: boolean) {
        const logEntry = new LogEntry();
        logEntry.executionType = targetActivated
            ? /*t*/"game.debug_log_executed_action"
            : /*t*/"game.debug_log_deactivated_action_not_executed";
        logEntry.executionEntity = target.title();
        logEntry.executionEntityId = target.$modelId;
        if (source) {
            logEntry.executionSourceEntity = source.title();
            logEntry.executionSourceId = source.$modelId;
        }
        return logEntry;
    }

    public static byDeactivatedSourceNode(source: ActionModel) {
        const logEntry = new LogEntry();
        logEntry.executionType = /*t*/"game.debug_log_action_after_deactivated_action_not_executed";
        logEntry.executionEntity = source.title();
        logEntry.executionEntityId = source.$modelId;
        return logEntry;
    }

    public static byStartedGame() {
        const logEntry = new LogEntry();
        logEntry.executionType = "game.debug_log_game_started";
        logEntry.useSeparator = true;
        return logEntry;
    }

    public static byLoadedMap(map: ReadonlyMapData) {
        const logEntry = new LogEntry();
        logEntry.executionType = "game.debug_log_map_loaded";
        logEntry.executionEntity = map.properties.name;
        return logEntry;
    }

    public static byDialogAnswer(index: number) {
        const logEntry = new LogEntry();
        logEntry.executionType = "game.debug_log_dialog_option_chosen";
        logEntry.executionEntity = index + "";
        return logEntry;
    }

    public static byCameraTargetReached(action: ActionModel) {
        return LogEntry.byExecutionType("game.debug_log_camera_target_reached", action);
    }

    public static byCameraReturned(action: ActionModel) {
        return LogEntry.byExecutionType("game.debug_log_camera_returned", action);
    }

    public static byCameraShaked(action: ActionModel) {
        return LogEntry.byExecutionType("game.debug_log_camera_shaked", action);
    }

    public static byCameraOverlayFaded(action: ActionModel, fadedIn: boolean) {
        return LogEntry.byExecutionType(fadedIn ? "game.debug_log_camera_overlay_faded_in" : "game.debug_log_camera_overlay_faded_out", action);
    }

    private static byExecutionType(executionType: string, action: ActionModel, isWarning = false) {
        const logEntry = new LogEntry();
        logEntry.executionType = executionType;
        logEntry.executionEntity = action.title();
        logEntry.executionEntityId = action.$modelId;
        logEntry.isWarning = isWarning;
        return logEntry;
    }

    public static warnSameActionAlreadyRunning(action: ActionModel) {
        return LogEntry.byExecutionType("game.debug_log_already_running_action", action, true);
    }

    public static warnSoundNotFound(action: ActionModel) {
        return LogEntry.byExecutionType("game.debug_log_sound_not_found_action", action, true);
    }

    public static warnCameraIsInUse(action: ActionModel) {
        return LogEntry.byExecutionType("game.debug_log_camera_is_in_use", action, true);
    }


    public toString(t: TFunction) {
        let result = this.time + " | " + t(this.executionType);
        if (this.executionEntity) result += " | " + t(this.executionEntity);
        if (this.executionEntityId) result += " | " + this.executionEntityId;
        if (this.executionSourceEntity) result += " | triggered by " + t(this.executionSourceEntity) + " (" + this.executionSourceId + ")";
        return result;
    }
}