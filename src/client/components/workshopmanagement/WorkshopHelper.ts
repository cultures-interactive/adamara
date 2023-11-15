import { ReadonlyEditorModule } from "../../../shared/workshop/ModuleModel";
import { managementClient } from "../../communication/ManagementClient";
import { navigateTo } from "../../helper/navigationHelpers";
import { editorStore } from "../../stores/EditorStore";
import { undoStore } from "../../stores/undo/UndoStore";
import { managementStore } from "../../stores/ManagementStore";
import { History } from 'history';
import { routes } from "../../data/routes";
import { editorClient } from "../../communication/EditorClient";
import { userStore } from "../../stores/UserStore";

export function openProductionEditor(history: History, moduleId: string = undefined) {
    if (moduleId) {
        const module = managementStore.getModule(moduleId);
        const workshop = managementStore.getWorkshop(module.workshopId);
        editorStore.setSessionModule(new ReadonlyEditorModule(module, workshop.name));
    } else {
        editorStore.setSessionModule(null);
    }

    userStore.setMapEditorComplexityAccordingToPrivilegeLevel();

    editorClient.clearReloadMapIdOnReconnection();

    undoStore.clear();

    navigateTo(history, routes.editorAction);
}