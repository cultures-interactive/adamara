import { Socket } from "socket.io";
import { ServerState } from "../data/ServerState";
import { ServerBase, SocketIOServer } from "./ServerBase";
import { RequestHandler as ExpressRequestHandler } from "express";
import { ManagementClientToServerEvents, ManagementServerToClientEvents } from "../../shared/definitions/socket.io/socketIODefinitions";
import { arrayActions, fromSnapshot, getSnapshot } from "mobx-keystone";
import { TranslatedError } from "../../shared/definitions/errors/TranslatedError";
import { ActionTree } from "../database/models/ActionTree";
import { checkAndApplyPatchOrThrow } from "../../shared/helper/mobXHelpers";
import { dataConstants } from "../../shared/data/dataConstants";
import { routeWrapperAsync, routeWrapper } from "./serverUtils";
import { logger } from "../integrations/logging";
import { ModuleModel, ModuleSnapshot } from "../../shared/workshop/ModuleModel";
import { ActionTreeModel, ActionTreeType } from "../../shared/action/ActionTreeModel";
import { sequelize } from "../database/db";
import { WorkshopModel } from "../../shared/workshop/WorkshopModel";
import { Module } from "../database/models/Module";
import { ActionTreeWithMetaData } from "../data/ActionTreeWithMetaData";
import { UserPrivileges } from "../../shared/definitions/apiResults/AuthCheckLoginStatusResult";
import { Sentry } from "../integrations/sentry";
import { TreeExitActionModel, TreePropertiesActionModel } from "../../shared/action/ActionModel";
import { Workshop } from "../database/models/Workshop";
import { generateUniqueAccesscode, moduleParticipantAccessCodeConfig, workshopAdminAccessCodeConfig, workshopPlayCodeConfig } from "../../shared/helper/accesscodeHelpers";
import { createPlayableModule } from "../helper/moduleHelpers";

const allWorkshopsRoom = "allWorkshops";
const getWorkshopSocketRoom = (workshopId: string) => "workshop_" + workshopId;

export class ManagementServer extends ServerBase<ManagementClientToServerEvents, ManagementServerToClientEvents> {

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
        logger.info("ManagementServer: socket.io server ready.");
    }

    private async onConnection(socket: Socket<ManagementClientToServerEvents, ManagementServerToClientEvents>): Promise<void> {
        const {
            forThisClient,
            forEveryone,
            availableOnlyToAdminUser,
            throwIfUserIsNotLoggedIn,
            getLatestEventName
        } = super.connectSocket(socket);

        const { privilegeLevel } = socket.request.user;
        if (privilegeLevel === UserPrivileges.Admin) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            socket.join(allWorkshopsRoom);
        } else if (privilegeLevel === UserPrivileges.SingleWorkshopAdmin) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            socket.join(getWorkshopSocketRoom(socket.request.user.workshopId));
        }

        const forEveryoneWhoMayAccessWorkshop = (workshopId: string) => {
            return this.io.to([allWorkshopsRoom, getWorkshopSocketRoom(workshopId)]);
        };

        const forEveryoneElseWhoMayAccessWorkshop = (workshopId: string) => {
            return socket.broadcast.to([allWorkshopsRoom, getWorkshopSocketRoom(workshopId)]);
        };

        const availableOnlyToWorkshopOrAdminUser = () => {
            throwIfUserIsNotLoggedIn();
            if ((socket.request.user.privilegeLevel === UserPrivileges.SingleWorkshopAdmin) || (socket.request.user.privilegeLevel === UserPrivileges.Admin))
                return;

            Sentry.captureMessage("[availableOnlyToWorkshopOrAdminUser] User was not authenticated on EditorServer call: " + getLatestEventName());
            throw new TranslatedError("editor.error_not_workshop_user_or_admin");
        };

        const availableOnlyToUserWithWorkshopEditRights = (workshopId: string) => {
            throwIfUserIsNotLoggedIn();

            const { privilegeLevel } = socket.request.user;

            if (privilegeLevel === UserPrivileges.Admin)
                return;

            if (privilegeLevel === UserPrivileges.SingleWorkshopAdmin) {
                if (workshopId && (socket.request.user.workshopId === workshopId))
                    return;
            }

            Sentry.captureMessage(`[availableOnlyToUserWithWorkshopEditRights] User was not authorized to edit workshop "${workshopId}": ${getLatestEventName()}`);
            throw new TranslatedError("editor.error_not_authorized");
        };

        const availableOnlyToUserWithActiveModuleEditRights = (moduleId: string) => {
            const serverModule = this.serverState.getActiveModule(moduleId);
            availableOnlyToUserWithWorkshopEditRights(serverModule?.snapshot.workshopId);
        };

        const availableOnlyToUserWithActiveOrDeletedModuleEditRights = (moduleId: string) => {
            const serverModule = this.serverState.getActiveOrDeletedModule(moduleId);
            availableOnlyToUserWithWorkshopEditRights(serverModule?.snapshot.workshopId);
        };

        const sendModuleMapList = () => {
            socket.emit("moduleMapListUpdated", this.serverState.getModuleMapList());
        };

        socket.on("startManagementInitialization", routeWrapperAsync(
            "startManagementInitialization",
            availableOnlyToWorkshopOrAdminUser,
            async (callback) => {
                const { workshopId, privilegeLevel } = socket.request.user;
                if (privilegeLevel === UserPrivileges.SingleWorkshopAdmin) {
                    const workshop = this.serverState.getActiveWorkshop(workshopId);
                    if (!workshop)
                        throw new TranslatedError("editor.error_workshop_does_not_exist");
                }

                let workshops = this.serverState.activeWorkshops;
                let modules = this.serverState.activeModules;

                if (privilegeLevel !== UserPrivileges.Admin) {
                    workshops = workshops.filter(workshop => workshop.id === workshopId);
                    modules = modules.filter(module => module.snapshot.workshopId === workshopId);
                }

                const playableModules = this.serverState.activeModules.map(module => createPlayableModule(module.snapshot, this.serverState));

                forThisClient.emit("initializeManagement", dataConstants.gitCommitSHA, workshopId);
                forThisClient.emit("allWorkshopsUpdated", workshops.map(t => t.snapshot));
                forThisClient.emit("allModulesUpdated", modules.map(t => t.snapshot));
                forThisClient.emit("allPlayableModulesUpdated", playableModules);
                sendModuleMapList();
                forThisClient.emit("initializeManagementFinished");

                this.serverState.on("updatedMapList", sendModuleMapList);
                socket.on("disconnect", () => {
                    this.serverState.off("updatedMapList", sendModuleMapList);
                });

                callback(null);
            }
        ));

        socket.on("createWorkshop", routeWrapper(
            "createWorkshop",
            availableOnlyToAdminUser,
            (callback) => {
                const newAccesscode = generateUniqueAccesscode(workshopAdminAccessCodeConfig, accesscode => this.serverState.accessCodeExists(accesscode, true));
                const newPlaycode = generateUniqueAccesscode(workshopPlayCodeConfig, accesscode => this.serverState.accessCodeExists(accesscode, true));

                const newWorkshop = new WorkshopModel({ accesscode: newAccesscode, playcode: newPlaycode });
                const workshopSnapshot = getSnapshot(newWorkshop);

                this.serverState.addWorkshopViaSnapshot(workshopSnapshot);

                forEveryoneElseWhoMayAccessWorkshop(newWorkshop.$modelId).emit("workshopUpdated", workshopSnapshot, []);
                callback(null, workshopSnapshot);
            }
        ));

        socket.on("deleteWorkshop", routeWrapper(
            "deleteWorkshop",
            availableOnlyToAdminUser,
            (workshopId: string, callback) => {
                const serverWorkshop = this.serverState.getActiveOrDeletedWorkshop(workshopId);

                if (!serverWorkshop) {
                    throw new TranslatedError("editor.error_workshop_does_not_exist");
                }
                if (serverWorkshop.deleted) {
                    throw new TranslatedError("editor.error_workshop_is_already_deleted");
                }

                const deleteModules = new Array<Module>();
                const deleteModuleSubtrees = new Array<ActionTreeWithMetaData>();

                serverWorkshop.snapshot.modules.map(moduleId => {
                    const serverModule = this.serverState.getActiveOrDeletedModule(moduleId);

                    if (!serverModule) {
                        throw new TranslatedError("editor.error_module_does_not_exist");
                    }

                    if (serverModule.deleted) {
                        throw new TranslatedError("editor.error_module_is_already_deleted");
                    }

                    const serverModuleSubtree = this.serverState.actionTreesWithMetadata.get(serverModule.snapshot.actiontreeId);

                    if (!serverModuleSubtree) {
                        throw new TranslatedError("editor.error_module_subtree_does_not_exist");
                    }

                    if (serverModuleSubtree.actionTree.deleted) {
                        throw new TranslatedError("editor.error_module_subtree_is_already_deleted");
                    }

                    deleteModules.push(serverModule);
                    deleteModuleSubtrees.push(serverModuleSubtree);
                });

                serverWorkshop.deleted = true;

                // Delete all modules that belong to this workshop
                for (const module of deleteModules) {
                    module.deleted = true;
                }

                for (const subtree of deleteModuleSubtrees) {
                    subtree.actionTree.deleted = true;
                }

                forEveryoneWhoMayAccessWorkshop(workshopId).emit("workshopDeleted", workshopId);

                for (const module of deleteModules) {
                    forEveryone.emit("playableModuleDeleted", module.id);
                }

                callback(null);
            }
        ));

        socket.on("unDeleteWorkshop", routeWrapper(
            "unDeleteWorkshop",
            availableOnlyToAdminUser,
            (workshopId: string, callback) => {
                const serverWorkshop = this.serverState.getActiveOrDeletedWorkshop(workshopId);

                if (!serverWorkshop) {
                    throw new TranslatedError("editor.error_workshop_does_not_exist");
                }

                if (!serverWorkshop.deleted) {
                    throw new TranslatedError("editor.error_workshop_is_not deleted");
                }

                const undeleteModules = new Array<Module>();
                const undeleteModuleSubtrees = new Array<ActionTreeWithMetaData>();

                serverWorkshop.snapshot.modules.map(moduleId => {
                    const serverModule = this.serverState.getActiveOrDeletedModule(moduleId);

                    if (!serverModule) {
                        throw new TranslatedError("editor.error_module_does_not_exist");
                    }

                    if (!serverModule.deleted) {
                        throw new TranslatedError("editor.error_module_is_not deleted");
                    }

                    const serverModuleSubtree = this.serverState.actionTreesWithMetadata.get(serverModule.snapshot.actiontreeId);

                    if (!serverModuleSubtree) {
                        throw new TranslatedError("editor.error_module_subtree_does_not_exist");
                    }

                    undeleteModules.push(serverModule);
                    undeleteModuleSubtrees.push(serverModuleSubtree);
                });

                serverWorkshop.deleted = false;

                // Un-delete every module blonging to this workshop and collect snapshots to send to client
                const moduleSnapshots: ModuleSnapshot[] = [];

                for (const module of undeleteModules) {
                    module.deleted = false;
                    moduleSnapshots.push(module.snapshot);
                }

                for (const subtree of undeleteModuleSubtrees) {
                    subtree.actionTree.deleted = false;
                }

                forEveryoneWhoMayAccessWorkshop(workshopId).emit("workshopUpdated", serverWorkshop.snapshot, moduleSnapshots);

                for (const module of undeleteModules) {
                    forEveryone.emit("playableModuleUpdated", createPlayableModule(module.snapshot, this.serverState));
                }

                callback(null);
            }
        ));

        socket.on("submitWorkshopChanges", routeWrapper(
            "submitWorkshopChanges",
            availableOnlyToUserWithWorkshopEditRights,
            (workshopId, patch, inversePatch, callback) => {
                const serverWorkshop = this.serverState.getActiveWorkshop(workshopId);

                if (!serverWorkshop) {
                    throw new TranslatedError("editor.error_workshop_change_submitted_but_workshop_does_not_exist");
                }

                const snapshot = serverWorkshop.snapshot;
                const workshop = fromSnapshot<WorkshopModel>(snapshot);

                const pathStart = patch.path[0];
                if ((pathStart === "accesscode") || (pathStart === "playcode")) {
                    if (socket.request.user.privilegeLevel !== UserPrivileges.Admin)
                        throw new TranslatedError("editor.error_not_authorized");

                    if (patch.op === "replace") {
                        if (this.serverState.accessCodeExists(patch.value, true)) {
                            forThisClient.emit("workshopChanged", workshopId, {
                                op: "replace",
                                path: patch.path,
                                value: (pathStart === "accesscode") ? workshop.accesscode : workshop.playcode
                            });
                            throw new Error("Already used");
                        }
                    } else {
                        throw new Error("Cannot use " + patch.op + " on " + patch.path[0]);
                    }
                }

                checkAndApplyPatchOrThrow(workshop, patch, inversePatch, /*t*/"editor.error_generic_change_submitted_conflict");
                serverWorkshop.snapshot = getSnapshot(workshop);

                forEveryoneElseWhoMayAccessWorkshop(workshopId).emit("workshopChanged", workshopId, patch);

                callback(null);
            }
        ));

        socket.on("createModule", routeWrapperAsync(
            "createModule",
            availableOnlyToUserWithWorkshopEditRights,
            async (workshopId, callback) => {
                const serverWorkshop = this.serverState.getActiveWorkshop(workshopId);
                if (!serverWorkshop)
                    throw new TranslatedError("editor.error_workshop_does_not_exist");

                // Create the subtree for the model
                const newModuleSubtree = ActionTreeModel.createEmptyPrototype();
                newModuleSubtree.setType(ActionTreeType.ModuleRoot);
                arrayActions.delete(newModuleSubtree.nonSubTreeActions, newModuleSubtree.nonSubTreeActions.findIndex(action => action instanceof TreePropertiesActionModel));
                newModuleSubtree.setStartAtAct(1);
                const exitNodeXPosition = 2000;
                const treeExistAction = newModuleSubtree.nonSubTreeActions.find(action => action instanceof TreeExitActionModel);
                treeExistAction.position.setX(exitNodeXPosition); // Move exit action model further to the right so the subtree shows larger in action editor
                const subtreeSnapshot = getSnapshot(newModuleSubtree);

                const newAccesscode = generateUniqueAccesscode(moduleParticipantAccessCodeConfig, accesscode => this.serverState.accessCodeExists(accesscode, true));
                const newModule = new ModuleModel({ accesscode: newAccesscode, workshopId, actiontreeId: newModuleSubtree.$modelId });
                const moduleSnapshot = getSnapshot(newModule);

                // Save subtree
                await sequelize.transaction(async transaction => {
                    const newActionTree = await ActionTree.create({
                        snapshotJSONString: JSON.stringify(subtreeSnapshot),
                        id: subtreeSnapshot.$modelId,
                        deleted: false
                    }, {
                        transaction
                    });
                    this.serverState.createAndAddActionTreeWithMetaData(newActionTree);
                });

                // Add to workshop
                const workshopModulesList = this.addModuleToWorkshop(newModule.$modelId, serverWorkshop);

                // Save model
                this.serverState.addModuleViaSnapshot(moduleSnapshot);

                forEveryoneWhoMayAccessWorkshop(workshopId).emit("moduleUpdated", moduleSnapshot, workshopModulesList);
                forEveryone.emit("playableModuleUpdated", createPlayableModule(moduleSnapshot, this.serverState));

                callback(null, moduleSnapshot);
            }
        ));

        socket.on("deleteModule", routeWrapper(
            "deleteModule",
            availableOnlyToUserWithActiveOrDeletedModuleEditRights,
            (moduleId: string, callback) => {
                const serverModule = this.serverState.getActiveOrDeletedModule(moduleId);
                const serverModuleSubtree = this.serverState.actionTreesWithMetadata.get(serverModule.snapshot.actiontreeId);

                if (!serverModule) {
                    throw new TranslatedError("editor.error_module_does_not_exist");
                }
                if (serverModule.deleted) {
                    throw new TranslatedError("editor.error_module_is_already_deleted");
                }
                if (!serverModuleSubtree) {
                    throw new TranslatedError("editor.error_module_subtree_does_not_exist");
                }
                if (serverModuleSubtree.actionTree.deleted) {
                    throw new TranslatedError("editor.error_module_subtree_is_already_deleted");
                }

                const { workshopId } = serverModule.snapshot;
                const serverWorkshop = this.serverState.getActiveWorkshop(workshopId);
                if (!serverWorkshop)
                    throw new TranslatedError("editor.error_workshop_does_not_exist");

                serverModule.deleted = true;
                serverModuleSubtree.actionTree.deleted = true;

                // Remove from workshop
                const workshopModulesList = this.removeModuleFromWorkshop(moduleId, serverWorkshop);

                forEveryoneWhoMayAccessWorkshop(workshopId).emit("moduleDeleted", moduleId, workshopModulesList);
                forEveryone.emit("playableModuleDeleted", moduleId);

                callback(null);
            }
        ));

        socket.on("unDeleteModule", routeWrapper(
            "unDeleteModule",
            availableOnlyToUserWithActiveOrDeletedModuleEditRights,
            (moduleId: string, callback) => {
                const serverModule = this.serverState.getActiveOrDeletedModule(moduleId);
                const moduleSnapshot = serverModule.snapshot;
                const serverModuleSubtree = this.serverState.actionTreesWithMetadata.get(moduleSnapshot.actiontreeId);

                if (!serverModule) {
                    throw new TranslatedError("editor.error_module_does_not_exist");
                }
                if (!serverModule.deleted) {
                    throw new TranslatedError("editor.error_module_is_not deleted");
                }

                const { workshopId } = moduleSnapshot;
                const serverWorkshop = this.serverState.getActiveWorkshop(workshopId);
                if (!serverWorkshop)
                    throw new TranslatedError("editor.error_workshop_does_not_exist");

                serverModule.deleted = false;
                serverModuleSubtree.actionTree.deleted = false;

                // Add to workshop
                const workshopModulesList = this.addModuleToWorkshop(moduleId, serverWorkshop);

                forEveryoneWhoMayAccessWorkshop(workshopId).emit("moduleUpdated", moduleSnapshot, workshopModulesList);
                forEveryone.emit("playableModuleUpdated", createPlayableModule(moduleSnapshot, this.serverState));

                callback(null);
            }
        ));

        socket.on("submitModuleChanges", routeWrapper(
            "submitModuleChanges",
            availableOnlyToUserWithActiveModuleEditRights,
            (moduleId, patch, inversePatch, callback) => {
                const serverModule = this.serverState.getActiveModule(moduleId);

                if (!serverModule) {
                    throw new TranslatedError("editor.error_module_change_submitted_but_module_does_not_exist");
                }

                const snapshot = serverModule.snapshot;
                const module = fromSnapshot<ModuleModel>(snapshot);

                const pathStart = patch.path[0];
                if (pathStart === "accesscode") {
                    if (socket.request.user.privilegeLevel !== UserPrivileges.Admin)
                        throw new TranslatedError("editor.error_not_authorized");

                    if (patch.op === "replace") {
                        if (this.serverState.accessCodeExists(patch.value, true)) {
                            forThisClient.emit("moduleChanged", moduleId, {
                                op: "replace",
                                path: patch.path,
                                value: module.accesscode
                            });
                            throw new Error("Already used");
                        }
                    } else {
                        throw new Error("Cannot use " + patch.op + " on " + patch.path[0]);
                    }
                }

                checkAndApplyPatchOrThrow(module, patch, inversePatch, /*t*/"editor.error_generic_change_submitted_conflict");
                if (module.startAtAct !== serverModule.snapshot.startAtAct) {
                    const actionTree = this.serverState.actionTreesWithMetadata.get(module.actiontreeId);
                    actionTree.actionTreeModel.setStartAtAct(module.startAtAct);
                }

                const changedModuleSnapshot = getSnapshot(module);
                serverModule.snapshot = changedModuleSnapshot;

                const { workshopId } = changedModuleSnapshot;
                forEveryoneElseWhoMayAccessWorkshop(workshopId).emit("moduleChanged", moduleId, patch);
                forEveryone.emit("playableModuleUpdated", createPlayableModule(changedModuleSnapshot, this.serverState));

                callback(null);
            }
        ));
    }

    private addModuleToWorkshop(moduleId: string, serverWorkshop: Workshop): string[] {
        return this.addOrRemoveModuleFromActiveWorkshop(moduleId, serverWorkshop, true);
    }

    private removeModuleFromWorkshop(moduleId: string, serverWorkshop: Workshop): string[] {
        return this.addOrRemoveModuleFromActiveWorkshop(moduleId, serverWorkshop, false);
    }

    private addOrRemoveModuleFromActiveWorkshop(moduleId: string, serverWorkshop: Workshop, addModule: boolean): string[] {
        const workshop = fromSnapshot<WorkshopModel>(serverWorkshop.snapshot);
        if (addModule)
            workshop.addModule(moduleId);
        else
            workshop.removeModule(moduleId);
        const workshopSnapshot = getSnapshot(workshop);
        serverWorkshop.snapshot = workshopSnapshot;
        return workshopSnapshot.modules;
    }
}