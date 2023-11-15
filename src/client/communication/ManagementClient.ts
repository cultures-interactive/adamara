import { runInAction } from "mobx";
import { fromSnapshot } from "mobx-keystone";
import { io, Socket } from "socket.io-client";
import { autoResolveRejectCallback, ManagementClientToServerEvents, ManagementServerToClientEvents, throwIfErrorSet } from "../../shared/definitions/socket.io/socketIODefinitions";
import { AugmentedPatch } from "../../shared/helper/mobXHelpers";
import { editorStore } from "../stores/EditorStore";
import { PatchTracker } from "./editorClient/PatchTracker";
import { managementStore } from "../stores/ManagementStore";
import { undoableWorkshopSubmitChanges } from "../stores/undo/operation/WorkshopSubmitChangesOp";
import { undoableModuleSubmitChanges } from "../stores/undo/operation/ModuleSubmitChangesOp";
import { WorkshopModel, WorkshopSnapshot } from "../../shared/workshop/WorkshopModel";
import { ModuleModel, ModuleSnapshot, PlayableModule } from "../../shared/workshop/ModuleModel";
import { addErrorIfSet, ClientBase, DisconnectReason } from "./ClientBase";
import { undoStore } from "../stores/undo/UndoStore";

class ManagementClient extends ClientBase<ManagementServerToClientEvents, ManagementClientToServerEvents> {
    private workshopPatchTracker: Map<string, PatchTracker>;
    private modulePatchTracker: Map<string, PatchTracker>;

    public constructor() {
        super();
        this.workshopPatchTracker = new Map<string, PatchTracker>();
        this.modulePatchTracker = new Map<string, PatchTracker>();
    }

    public connectManagement() {
        if (this.socket)
            return;

        undoStore.clear();

        this.socket = io({
            transports: ['websocket'],
            query: {
                username: editorStore.username
            }
        });

        const afterConnect = () => {
            this.socket.emit("startManagementInitialization", addErrorIfSet);
        };

        const afterDisconnect = (reason: Socket.DisconnectReason) => {
            this.stopTrackingAllWorkshopsAndModules();

            runInAction(() => {
                managementStore.clear();
            });

            console.log("Completed disconnection cleanup.");

            if (reason === DisconnectReason.IOServerDisconnect) {
                // Manually reconnect
                this.socket.connect();
            }
        };

        this.registerBasicCallbacks(afterConnect, afterDisconnect, false);

        this.socket.on("initializeManagement", (serverGitCommitSHA: string, sessionworkshopId: string) => {
            if (this.reactToServerGitCommitSHA(serverGitCommitSHA))
                return;

            console.log("Initializing Management.");
            console.log("Session Workshop Id: ", sessionworkshopId);

            managementStore.setSessionWorkshop(sessionworkshopId);
        });

        this.socket.on("initializeManagementFinished", () => {
            console.log("Management Init Done!");
            managementStore.setInitialized(true);
        });

        this.socket.on("allWorkshopsUpdated", async (workshopSnapshots: WorkshopSnapshot[]) => {
            const serverWorkshops = new Map(workshopSnapshots.map(w => [w.$modelId, fromSnapshot<WorkshopModel>(w)]));
            managementStore.setAllWorkshops(serverWorkshops);
            managementStore.getAllWorkshops.map(workshop => this.startTrackingWorkshop(workshop));
        });

        this.socket.on("workshopUpdated", async (workshopSnapshot: WorkshopSnapshot, moduleSnapshots: ModuleSnapshot[]) => {
            managementStore.setWorkshop(fromSnapshot<WorkshopModel>(workshopSnapshot));
            this.startTrackingWorkshop(managementStore.getWorkshop(workshopSnapshot.$modelId));

            moduleSnapshots.map(moduleSnapshot => {
                managementStore.setModule(fromSnapshot<ModuleModel>(moduleSnapshot));
                this.startTrackingModule(managementStore.getModule(moduleSnapshot.$modelId));
            });
        });

        this.socket.on("workshopDeleted", async (workshopId: string) => {
            const workshop = managementStore.getWorkshop(workshopId);
            if (workshop) {
                managementStore.deleteWorkshop(workshopId);
                this.stopTrackingWorkshop(workshopId);

                workshop.modules.map(moduleId => {
                    managementStore.deleteModule(moduleId);
                    this.stopTrackingModule(moduleId);
                });
            }
        });

        this.socket.on("workshopChanged", async (workshopId: string, patch: AugmentedPatch) => {
            const workshop = managementStore.getWorkshop(workshopId);
            if (workshop) {
                this.patch(workshop, patch);
            }
        });

        this.socket.on("allModulesUpdated", async (moduleSnapshots) => {
            const serverModules = new Map(moduleSnapshots.map(m => [m.$modelId, fromSnapshot<ModuleModel>(m)]));
            managementStore.setAllModules(serverModules);
            managementStore.getAllModules.map(module => this.startTrackingModule(module));
        });

        this.socket.on("moduleMapListUpdated", async (moduleMapList) => {
            managementStore.setModuleMapList(moduleMapList);
        });

        this.socket.on("moduleUpdated", async (moduleSnapshot: ModuleSnapshot, workshopModuleList: string[]) => {
            managementStore.setModule(fromSnapshot<ModuleModel>(moduleSnapshot));
            this.startTrackingModule(managementStore.getModule(moduleSnapshot.$modelId));

            // Update Workshop to have the new module list
            this.changeWithoutTriggeringPatchTrackers(() => {
                managementStore.getWorkshop(moduleSnapshot.workshopId).setModules(workshopModuleList);
            });
        });

        this.socket.on("moduleDeleted", async (moduleId: string, workshopModuleList: string[]) => {
            const module = managementStore.getModule(moduleId);
            if (module) {
                const workshopId = module.workshopId;
                managementStore.deleteModule(moduleId);
                this.stopTrackingModule(moduleId);

                // Update Workshop to have the new module list
                this.changeWithoutTriggeringPatchTrackers(() => {
                    managementStore.getWorkshop(workshopId).setModules(workshopModuleList);
                });
            }
        });

        this.socket.on("moduleChanged", async (moduleId: string, patch: AugmentedPatch) => {
            const module = managementStore.getModule(moduleId);
            if (module) {
                this.patch(module, patch);
            }
        });

        this.socket.on("allPlayableModulesUpdated", async (playableModules) => {
            const playableModulesMap = new Map(playableModules.map(m => [m.$modelId, m]));
            managementStore.setAllPlayableModules(playableModulesMap);
        });

        this.socket.on("playableModuleUpdated", async (playableModule: PlayableModule) => {
            managementStore.setPlayableModule(playableModule);
        });

        this.socket.on("playableModuleDeleted", async (moduleId: string) => {
            managementStore.deletePlayableModule(moduleId);
        });
    }

    public createWorkshop() {
        return this.actionPromise<WorkshopModel>((resolve, reject) => {
            this.socket.emit("createWorkshop", (error, workshopSnapshot) => {
                try {
                    const workshop = fromSnapshot<WorkshopModel>(workshopSnapshot);
                    throwIfErrorSet(error);
                    this.startTrackingWorkshop(workshop);
                    resolve(workshop);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public deleteWorkshop(workshopId: string) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("deleteWorkshop", workshopId, autoResolveRejectCallback(resolve, reject));
        });
    }

    public unDeleteWorkshop(workshopId: string) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("unDeleteWorkshop", workshopId, autoResolveRejectCallback(resolve, reject));
        });
    }

    public patchWorkshop(workshopId: string, patch: AugmentedPatch) {
        const workshop = managementStore.getWorkshop(workshopId);
        this.patch(workshop, patch);
    }

    public submitWorkshopChanges(workshopId: string, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("submitWorkshopChanges", workshopId, patch, inversePatch, autoResolveRejectCallback(resolve, reject));
        });
    }

    public startTrackingWorkshop(workshop: WorkshopModel) {
        if (this.workshopPatchTracker.get(workshop.$modelId))
            return;

        const newWorkshopPatchTracker = new PatchTracker(this.applyingPatchesCallback);
        newWorkshopPatchTracker.startTracking(
            workshop,
            (patch, inversePatch) => {
                undoableWorkshopSubmitChanges(workshop.$modelId, patch, inversePatch);
            }
        );
        this.workshopPatchTracker.set(workshop.$modelId, newWorkshopPatchTracker);
    }

    public stopTrackingWorkshop(workshopId: string) {
        const workshopTracker = this.workshopPatchTracker.get(workshopId);
        if (!workshopTracker)
            return;
        workshopTracker.stopTracking();
        this.workshopPatchTracker.delete(workshopId);
    }

    public createModule(workshopId: string) {
        return this.actionPromise<ModuleModel>((resolve, reject) => {
            this.socket.emit("createModule", workshopId, (error, moduleSnapshot) => {
                try {
                    const module = fromSnapshot<ModuleModel>(moduleSnapshot);
                    throwIfErrorSet(error);
                    this.startTrackingModule(module);
                    resolve(module);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    public deleteModule(moduleId: string) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("deleteModule", moduleId, autoResolveRejectCallback(resolve, reject));
        });
    }

    public unDeleteModule(moduleId: string) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("unDeleteModule", moduleId, autoResolveRejectCallback(resolve, reject));
        });
    }

    public patchModule(moduleId: string, patch: AugmentedPatch) {
        const module = managementStore.getModule(moduleId);
        this.patch(module, patch);
    }

    public submitModuleChanges(moduleId: string, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("submitModuleChanges", moduleId, patch, inversePatch, autoResolveRejectCallback(resolve, reject));
        });
    }

    public requestModuleMapListUpdate() {
        return this.actionPromise<void>((resolve, reject) => {
            this.socket.emit("requestModuleMapListsUpdate", autoResolveRejectCallback(resolve, reject));
        });
    }

    public startTrackingModule(module: ModuleModel) {
        if (this.modulePatchTracker.get(module.$modelId))
            return;
        const newWorkshopPatchTracker = new PatchTracker(this.applyingPatchesCallback);
        newWorkshopPatchTracker.startTracking(
            module,
            (patch, inversePatch) => {
                undoableModuleSubmitChanges(module.$modelId, patch, inversePatch);
            }
        );
        this.modulePatchTracker.set(module.$modelId, newWorkshopPatchTracker);
    }

    public stopTrackingModule(moduleId: string) {
        const moduleTracker = this.modulePatchTracker.get(moduleId);
        if (!moduleTracker)
            return;
        moduleTracker.stopTracking();
        this.modulePatchTracker.delete(moduleId);
    }

    private stopTrackingAllWorkshopsAndModules() {
        this.modulePatchTracker.forEach(moduleTracker => moduleTracker.stopTracking());
        this.modulePatchTracker.clear();
        this.workshopPatchTracker.forEach(workshopTracker => workshopTracker.stopTracking());
        this.workshopPatchTracker.clear();
    }
}

export const managementClient = new ManagementClient();

if (module.hot) {
    module.hot.dispose(data => {
        managementClient.disconnect();
    });

    if (module.hot.data) {
        managementClient.connectManagement();
    }
}