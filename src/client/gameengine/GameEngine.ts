import { ActionTreeModel, getTreeParent, TreeAccess } from "../../shared/action/ActionTreeModel";
import { SetVariableActionModel, LocationTriggerActionModel, ActionModel, TreeExitActionModel, SetTagActionModel, TreeEnterActionModel, StartDialogueActionModel, ReceiveReputationActionModel, ReceiveItemActionModel, LooseItemActionModel, ReceiveQuestActionModel, FinishQuestActionModel, MoveMapElementActionModel, StartFightActionModel, MovePlayerActionModel, ActionScope, ReceiveAwarenessActionModel, InteractionTriggerActionModel, ConditionTriggerActionModel, ConditionActionModel, factions, SetPlayStyleActionModel, AbortQuestActionModel, ReceiveTaskActionModel, FinishTaskActionModel, AbortTaskActionModel, ResetAreaActionModel, ModifyPlayerHealthModel, TossCoinActionModel, CalculateVariableActionModel, CalculateVariableOperator, ShowTextActionModel, ShowImageActionModel, StartTimerActionModel, CommentActionModel, PlayAnimationActionModel, TriggerDamageInAreaActionModel, StartActActionModel, SetReputationStatusActionModel, StopMapElementActionModel, UseItemTriggerActionModel, SetPlayerInputActionModel, SetCameraActionModel, ShakeCameraActionModel, FadeCameraActionModel, SimpleCutSceneActionModel, SetEmergencyLightingActionModel, PlaySoundActionModel, DeactivateNodeGroupActionModel, CopyAwarenessIntoVariableActionModel, DebugStartActionModel } from '../../shared/action/ActionModel';
import { SelectableExitModel } from "../../shared/action/SelectableExitModel";
import { GameStateModel } from "./GameStateModel";
import { LoadedMap } from "./LoadedMap";
import { ConditionOperator, ConditionType, ConditionModel } from "../../shared/action/ConditionModel";
import { lastElement } from "../../shared/helper/generalHelpers";
import { DynamicMapElementMapMarkerInterface } from "../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel";
import { wrapArraySet } from "../../shared/helper/IterableIteratorWrapper";
import { resolvePotentialMapElementTreeParameter } from "../helper/treeParameterHelpers";
import { AnimationElementReferenceModel } from "../../shared/action/MapElementReferenceModel";
import { findVariableValue } from "../components/game/DialogueParser";
import { DamageInAreaVisualManager } from "../canvas/game/map/DamageInAreaVisualManager";
import { createIdToActionMap, parseFormattedTreeParameter, parseVariableNotation, registerActionTree } from "../../shared/helper/actionTreeHelper";
import { LogEntry } from "../stores/LogEntry";
import { CutSceneController } from "../canvas/game/controller/CutSceneController";
import { CameraController } from "../canvas/game/controller/CameraController";
import { gameStore } from "../stores/GameStore";
import { itemStore } from "../stores/ItemStore";
import { SoundActionHelper } from "../canvas/game/controller/SoundActionHelper";
import { Player } from "../canvas/game/character/Player";
import { AnimationElementValueModel } from "../../shared/action/ValueModel";
import { soundCache } from "../stores/SoundCache";
import { UiSounds } from "../canvas/game/sound/UiSounds";
import { sharedStore } from "../stores/SharedStore";
import { runInAction } from "mobx";
import { userStore } from "../stores/UserStore";
import { notificationController } from "../components/game/ui components/NotificationController";
import { ActionExtraInformation } from "../helper/gameActionTreeHelper";
import { gameConstants } from "../data/gameConstants";
import { PositionModel } from "../../shared/game/PositionModel";
import { isMainGameRoute } from "../data/routes";

export type LoadMapCallback = (mapId: number, targetObjectName: string, startPositionOverride: PositionModel) => Promise<void>;
export type MovePlayerCallback = (mapId: number, targetObjectName: string, transitionTime: number, teleportOnSameMap: boolean, actionModelId: string) => void;

export class GameEngine {

    public loadedMap: LoadedMap;
    private timerTimeouts = new Map<string, NodeJS.Timeout>();
    private nonBlockingDialogueTimeouts = new Map<string, NodeJS.Timeout>();

    private actionNodeCache = new Map<string, ActionModel>();
    private actionTreesById = new Map<string, ActionTreeModel>();
    private subTreesByParentId = new Map<string, ActionTreeModel[]>();

    private wasDisposed: boolean;
    private wasDisposedChecker = () => this.wasDisposed;

    public treeAccess: TreeAccess = {
        getSubTreesForActionTree: (actionTree: ActionTreeModel) => this.subTreesByParentId.get(actionTree.$modelId) || [],
        getTreeById: (modelId: string) => this.actionTreesById.get(modelId)
    };

    public constructor(
        public readonly rootActionTree: ActionTreeModel,
        subTrees: ActionTreeModel[],
        public readonly gameState: GameStateModel,
        private readonly loadMapCallback: LoadMapCallback = () => { return null; },
        private readonly movePlayerCallback: MovePlayerCallback = () => { },
        private readonly reportError: (error: Error) => void = e => { throw e; },
        private readonly onPlayerDamaged: () => void = () => { },
        private readonly damageInAreaVisualManager: DamageInAreaVisualManager = null,
        private readonly player: Player = null
    ) {
        this.finishPlayAnimationActionNode = this.finishPlayAnimationActionNode.bind(this);
        this.startTriggerDamageInAreaActionDamaging = this.startTriggerDamageInAreaActionDamaging.bind(this);
        this.getCachedActionNode = this.getCachedActionNode.bind(this);

        this.registerActionTree(rootActionTree);
        subTrees.forEach(subTree => this.registerActionTree(subTree));

        createIdToActionMap(rootActionTree, this.actionNodeCache);

        if (!isMainGameRoute()) {
            sharedStore.prepareMainGameRootActionTreesForGame();

            // Register module root trees
            sharedStore.modulesRootActionTrees?.forEach(subTree => {
                this.registerActionTree(subTree);
                createIdToActionMap(subTree, this.actionNodeCache);
            });
        }

        if (gameStore.debugStartMarkerMapId) {
            gameState.setCurrentMap(gameStore.debugStartMarkerMapId);
        }
    }

    public start() {
        soundCache.playOneOf(UiSounds.START_GAME);
        const loadMapPromise = this.loadMapCallback(this.gameState.currentMap, "", gameStore.debugStartMarker?.position);

        // Just execute action tree if loadMapCallback is left as default function. Needed for tests.
        if (loadMapPromise === null) {
            this.startActionTrees();
            return;
        }

        loadMapPromise
            .then(() => {
                if (this.wasDisposed)
                    return;

                const debugStartNode = gameStore.debugStartNodeModelId
                    ? this.getCachedActionNode(gameStore.debugStartNodeModelId) as DebugStartActionModel
                    : null;

                if (!debugStartNode || (debugStartNode && debugStartNode.initialize))
                    this.startActionTrees();
                if (debugStartNode)
                    this.executeActions(debugStartNode.nextActions, debugStartNode);
            })
            .catch(this.reportError);
    }

    private startActionTrees() {
        this.rootActionTree.enterActions.forEach(a => this.executeAction(a, null));

        if (!isMainGameRoute()) {
            // Execute module root trees when in play code mode, but only modules that start at act 1
            sharedStore.modulesRootActionTrees?.filter(subTree => userStore.isWorkshopPlayer ? subTree.startAtAct === 1 : true)
                .forEach(subTree => {
                    this.executeAction(subTree, null);
                });
        }
    }

    private registerActionTree(actionTree: ActionTreeModel) {
        this.actionTreesById.set(actionTree.$modelId, actionTree);
        registerActionTree(actionTree, this.subTreesByParentId, this.treeAccess);
    }

    public getCachedActionNode<T extends ActionModel>(modelId: string) {
        return this.actionNodeCache.get(modelId) as T;
    }

    /**
     * Returns a list of {@link ActionModel}s with the assigned ids or an empty array.
     * @param ids The ids to search for.
     */
    public searchActionNodes(ids: Array<string>): Array<ActionModel> {
        const returnValue = new Array<ActionModel>();
        if (ids) {
            ids.forEach(id => {
                const action = this.getCachedActionNode(id);
                if (action) returnValue.push(action);
            });
        }
        return returnValue;
    }

    /**
     * Searches for 'active' trigger nodes and returns them or an empty list.
     * @param filter Optional: Can be used to filter the list.
     */
    public searchActiveTriggerNodes(filter: (item: ActionModel) => boolean = null): Array<ActionModel> {
        const triggerIds = Array.from(gameStore.gameEngine.gameState.activeTriggerActions.values());
        const triggerNodes = gameStore.gameEngine.searchActionNodes(triggerIds);
        if (filter) return triggerNodes.filter(filter);
        return triggerNodes;
    }

    public onMapWasLoaded() {
        for (const [actionId, delayLeft] of this.gameState.notObservable.activeTriggerDamageInAreaDelays) {
            const action = this.getCachedActionNode<TriggerDamageInAreaActionModel>(actionId);
            const delay = +this.resolveIntoConcreteValue(action, action.delay);
            this.damageInAreaVisualManager.startCountdown(action, delay, delayLeft);
        }
        for (const [actionId, _] of this.gameState.notObservable.activeTriggerDamageInAreaDurations) {
            this.damageInAreaVisualManager.startTriggering(this.getCachedActionNode(actionId));
        }
    }

    public clearPlayerIsInsideTriggersList() {
        this.gameState.playerIsInsideTriggers.clear();
    }

    private sortExitActions(actions: SelectableExitModel) {
        if (actions.nextActions.length === 0)
            return [];

        if (actions.nextActions.length === 1)
            return [this.getCachedActionNode(actions.nextActions[0])];
        else {
            // The y-position of an action defines the execution order
            return actions.nextActions.map(actionId => this.getCachedActionNode(actionId)).sort(
                (a, b) => actions.yPositionInThisTree(a) - actions.yPositionInThisTree(b));
        }
    }

    public executeActions(actions: SelectableExitModel, source: ActionModel) {
        if (actions.nextActions.length === 0)
            return;

        if (source && this.gameState.deactivatedDeactivationGroupIds.has(source.deactivationGroupId)) {
            gameStore.addLog(LogEntry.byDeactivatedSourceNode(source));
            return;
        }

        this.sortExitActions(actions).forEach(nextAction => this.executeAction(nextAction, source));
    }

    public executeAction(action: ActionModel, source: ActionModel) {
        if (!action)
            return;

        if (this.gameState.deactivatedDeactivationGroupIds.has(action.deactivationGroupId)) {
            gameStore.addLog(LogEntry.byExecutedAction(action, source, false));
            return;
        }

        gameStore.addLog(LogEntry.byExecutedAction(action, source, true));

        // Subtree enter/exit and condition navigation
        if (action instanceof ActionTreeModel) {
            // legacy: newly created trees point directly to entry actions
            this.executeAction(action.enterActions[0], action);
        }
        if (action instanceof TreeEnterActionModel) {
            this.executeActions(action.enterActions, action);
        }
        if (action instanceof TreeExitActionModel) {
            this.executeActions(action.subTreeExit, action);
        }
        if (action instanceof ConditionActionModel) {
            if (this.doesConditionHold(action.condition, action)) {
                this.executeActions(action.conditionTrue, action);
            } else {
                this.executeActions(action.conditionFalse, action);
            }
        }
        if (action instanceof TossCoinActionModel) {
            if (Math.floor(Math.random() * 2) === 0) {
                this.executeActions(action.heads, action);
            } else {
                this.executeActions(action.tails, action);
            }
        }

        // Trigger Actions
        if (action instanceof LocationTriggerActionModel) {
            let executed = false;
            if (action.triggerOnEnter && action.checkOnActivation) {
                const mapElement = resolvePotentialMapElementTreeParameter(action.mapElement, "actions/AreaTriggerValueModel", action);
                if (this.gameState.playerIsInsideTriggers.has(mapElement.elementId)) {
                    this.executeActions(action.exitTrigger, action);
                    executed = true;
                }
            }

            if (!executed) {
                this.gameState.activeTriggerActions.add(action.$modelId);
            }
        }
        if (action instanceof InteractionTriggerActionModel) {
            this.gameState.activeTriggerActions.add(action.$modelId);
        }
        if (action instanceof ConditionTriggerActionModel) {
            this.gameState.activeTriggerActions.add(action.$modelId);
        }
        if (action instanceof UseItemTriggerActionModel) {
            this.gameState.activeTriggerActions.add(action.$modelId);
        }
        if (action instanceof TriggerDamageInAreaActionModel) {
            this.startTriggerDamageInAreaAction(action);
        }

        // Instant game state changing Actions
        if (action instanceof SetVariableActionModel) {
            this.gameState.setVariable(action.name, action.scope, this.resolvePotentialTreeParameter(action.value, action), this.rootActionTree, action);
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof CopyAwarenessIntoVariableActionModel) {
            this.gameState.setVariable(action.name, ActionScope.Global, this.gameState.playerAwareness.toString(), this.rootActionTree, action);
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof CalculateVariableActionModel) {
            this.gameState.setVariable(action.variableResult, action.scope, "" + this.calculate(action), this.rootActionTree, action);
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof SetTagActionModel) {
            this.gameState.playerTags.add(action.tag);
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof SetPlayStyleActionModel) {
            this.gameState.setPlayerPlayStyle(this.resolvePotentialTreeParameter(action.playStyle, action));
            this.executeActions(action.nextActions, action);
        }

        // Game state changing Actions that inform the player
        if (action instanceof StartDialogueActionModel) {
            soundCache.playOneOf(UiSounds.DIALOG_STARTS);
            if (action.answers.length === 0) {
                this.addNonBlockingDialogue(action);
                this.executeActions(action.defaultExit, action);
            } else {
                this.waitForPlayerConfirm(action);
            }
        }
        if (action instanceof ShowTextActionModel) {
            this.gameState.setActiveText(action.$modelId);
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof ShowImageActionModel) {
            this.gameState.setActiveImage(action.$modelId);
            this.executeActions(action.imageShown, action);
        }
        if (action instanceof StartTimerActionModel) {
            this.startOrResetTimer(action);
            this.executeActions(action.started, action);
        }
        if (action instanceof ReceiveReputationActionModel) {
            this.gameState.receiveReputation(action, this.resolvePotentialTreeParameter);
            this.informThePlayer(action);
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof ReceiveAwarenessActionModel) {
            this.gameState.setPlayerAwareness(this.gameState.playerAwareness + parseInt(this.resolvePotentialTreeParameter(action.amount, action)));
            this.informThePlayer(action);
            this.executeActions(action.nextActions, action);
        }

        if (action instanceof ReceiveItemActionModel) {
            const itemId = this.resolvePotentialTreeParameter(action.itemId, action);
            if (!this.gameState.playerInventory.has(itemId)) {
                this.gameState.playerInventory.add(itemId);
                this.informThePlayer(action, { itemId });
                soundCache.playOneOf(UiSounds.RECEIVE_ITEM);
            }
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof LooseItemActionModel) {
            const itemTags = action.itemTags().map(t => this.resolvePotentialTreeParameter(t, action));
            const item = itemTags.length > 0 ? null : this.resolvePotentialTreeParameter(action.itemId, action);
            const lostItemIds = this.gameState.looseItem(action, itemTags, item);
            if (lostItemIds.length > 0) {
                this.informThePlayer(action, { itemsIds: lostItemIds });
            }
            this.executeActions(action.nextActions, action);
        }

        if (action instanceof ReceiveQuestActionModel) {
            this.gameState.addQuest(action);
            this.informThePlayer(action);
            soundCache.playOneOf(UiSounds.START_QUEST);
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof FinishQuestActionModel) {
            if (this.gameState.deleteQuest(this.resolvePotentialTreeParameter(action.questId, action), this.getCachedActionNode)) {
                this.informThePlayer(action);
                soundCache.playOneOf(UiSounds.FINISH_QUEST);
            }
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof AbortQuestActionModel) {
            if (this.gameState.deleteQuest(this.resolvePotentialTreeParameter(action.questId, action), this.getCachedActionNode)) {
                this.informThePlayer(action);
            }
            this.executeActions(action.nextActions, action);
        }

        if (action instanceof ReceiveTaskActionModel) {
            this.gameState.addTask(action);
            this.informThePlayer(action);
            soundCache.playOneOf(UiSounds.START_QUEST_TASK);
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof FinishTaskActionModel) {
            if (this.gameState.deleteTask(action.taskId)) {
                this.informThePlayer(action);
                soundCache.playOneOf(UiSounds.FINISH_QUEST_TASK);
            }
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof AbortTaskActionModel) {
            if (this.gameState.deleteTask(action.taskId)) {
                this.informThePlayer(action);
            }
            this.executeActions(action.nextActions, action);
        }

        if (action instanceof ModifyPlayerHealthModel) {
            this.gameState.changePlayerHealth(parseInt(this.resolvePotentialTreeParameter(action.amount, action))); // if this goes below 0, reset/respawn in Game.ts is triggere
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof ResetAreaActionModel) {
            this.gameState.setPlayerHealth(0);
            this.executeActions(action.nextActions, action);
        }
        if (action instanceof StartFightActionModel) {
            this.gameState.setWaitingForCombatToFinishAction(action.$modelId);
        }

        if (action instanceof MovePlayerActionModel) {
            this.executeActions(action.directNextActions, action);
            const targetMarker = resolvePotentialMapElementTreeParameter(action.targetMapMarker, "actions/MapMarkerValueModel", action);
            this.movePlayerCallback(targetMarker.mapId, targetMarker.elementId,
                parseInt(this.resolvePotentialTreeParameter(action.transitionTime, action)) || 0, action.teleport, action.$modelId);
        }
        if (action instanceof MoveMapElementActionModel) {
            this.moveMapElement(action);
        }
        if (action instanceof StopMapElementActionModel) {
            const npcId = resolvePotentialMapElementTreeParameter(action.mapElement, undefined, action).elementId;
            this.cancelOngoingMoveMapElementActions(npcId);
            const elementToStop = this.loadedMap?.npcs.find(npc => npc.$modelId === npcId);
            if (!elementToStop) {
                console.warn("Can not find a map element with the id:", action.mapElement.elementId);
                return;
            }
            elementToStop.adjustGraphicTo(elementToStop.copyBasePosition());
            elementToStop.stop(false);
            this.executeActions(action.defaultExit, action);
        }

        if (action instanceof PlayAnimationActionModel) {
            this.startPlayAnimationActionNode(action);
        }

        if (action instanceof CommentActionModel) {
            this.executeActions(action.nextActions, action);
        }

        if (action instanceof StartActActionModel) {
            if (+action.act == this.gameState.currentAct + 1) {
                this.gameState.setCurrentAct(+action.act);

                if (!isMainGameRoute() && userStore.isWorkshopPlayer) {
                    sharedStore.modulesRootActionTrees?.filter(subTree => subTree.startAtAct === +action.act).forEach(subTree => {
                        this.executeAction(subTree, null);
                    });
                }
            }
            this.executeActions(action.nextActions, action);
        }

        if (action instanceof SetReputationStatusActionModel) {
            this.gameState.setPlayerReputationStatus(action.$modelId);
            this.executeActions(action.nextActions, action);
        }

        if (action instanceof SetPlayerInputActionModel) {
            this.gameState.setActionPropertyUIVisible(action.uiVisible);
            this.gameState.setActionPropertyMovementPossible(action.movementEnabled);
            this.executeActions(action.nextActions, action);
        }

        if (action instanceof ShakeCameraActionModel) CameraController.startCameraShake(action);
        if (action instanceof SetCameraActionModel) CameraController.startCameraMove(action, this.player, this.loadedMap);
        if (action instanceof FadeCameraActionModel) CameraController.startFade(action, this.wasDisposedChecker);
        if (action instanceof SimpleCutSceneActionModel) CutSceneController.startCutScene(action);
        if (action instanceof PlaySoundActionModel) SoundActionHelper.handleSoundAction(action, this.player, this.loadedMap);

        if (action instanceof SetEmergencyLightingActionModel) {
            this.gameState.setActionPropertyEmergencyLightOverlayOpacity(action.activate ? 0.3 : 0);
            this.executeActions(action.nextActions, action);
        }

        if (action instanceof DeactivateNodeGroupActionModel) {
            this.deactivateNodesByGroupId(action.targetDeactivationGroupId);
            this.executeActions(action.nextActions, action);
        }

        this.handleConditionTrigger();
    }

    private informThePlayer(action: ActionModel, extraInformation?: ActionExtraInformation) {
        notificationController.addNotificationFromAction(action, extraInformation);
    }

    private waitForPlayerConfirm(action: ActionModel) {
        this.gameState.waitingForDialogueAnswerSelection.add(action.$modelId);
    }

    public playerCanMove() {
        if (this.isMovePlayerActionRunning()) return false;
        return this.gameState.waitingForDialogueAnswerSelection.size === 0
            && this.gameState.waitingForCombatToFinishAction === ""
            && this.gameState.actionPropertyMovementPossible
            && !gameStore.cameraIsAnimating;
    }

    /**
     * Returns true if there is a running {@link MovePlayerActionModel} action.
     */
    public isMovePlayerActionRunning() {
        for (const actionId of this.gameState.waitingForCharacterToReachTileActions) {
            const action = this.getCachedActionNode(actionId);
            if (action.$modelType === "actions/MovePlayerActionModel") return true;
        }
        return false;
    }

    public moveMapElement(action: MoveMapElementActionModel) {
        if (!this.loadedMap)
            return;

        const elementId = resolvePotentialMapElementTreeParameter(action.mapElement, undefined, action).elementId;
        this.cancelOngoingMoveMapElementActions(elementId);

        const markerReference = resolvePotentialMapElementTreeParameter(action.targetMapMarker, "actions/MapMarkerValueModel", action);
        const to = this.loadedMap.mapMarkers.find(target => target.$modelId === markerReference.elementId);
        if (!to)
            return;
        if (action.teleport) {
            const animFrom = this.loadedMap.animationElements.find(ae => ae.$modelId === elementId);
            if (animFrom) {
                animFrom.setPosition(to.position);
                this.executeActions(action.directNextActions, action);
                this.executeActions(action.nextActions, action);
                return;
            }
            const npcFrom = this.loadedMap.npcs.find(npc => npc.$modelId === elementId);
            if (npcFrom) {
                npcFrom.setNPCDataPosition(to.position);
                npcFrom.spawnAt(to.position);
                this.executeActions(action.directNextActions, action);
                this.executeActions(action.nextActions, action);
                return;
            }
            const MapMarkerfrom = this.loadedMap.mapMarkers.find(mapMarker => mapMarker.$modelId === elementId);
            if (MapMarkerfrom) {
                MapMarkerfrom.position = to.position;
                this.executeActions(action.directNextActions, action);
                this.executeActions(action.nextActions, action);
                return;
            }
            // Check against $modelId since we want to move a specific area trigger
            const AreaTriggerFrom = this.loadedMap.areaTriggers.find(areaTrigger => areaTrigger.$modelId === elementId);
            if (AreaTriggerFrom) {
                AreaTriggerFrom.position = to.position;
                this.executeActions(action.directNextActions, action);
                this.executeActions(action.nextActions, action);
                return;
            }

            this.reportError(new Error("Did not find map element to be teleported. Note that tiles with interaction triggers can not be moved."));
        } else {
            const fromNPC = this.loadedMap.npcs.find(source => source.$modelId === elementId);
            if (!fromNPC) {
                this.reportError(new Error("NPC not found or map element selected for moving without teleporting was not an NPC element."));
                return;
            }
            const doesMove = fromNPC.move(to.position, true, true);
            if (doesMove) {
                this.gameState.waitingForCharacterToReachTileActions.add(action.$modelId);
                this.executeActions(action.directNextActions, action);
            } else {
                this.executeActions(action.directNextActions, action);
                this.executeActions(action.nextActions, action); // Even if the element cannot move, pretend it reached the target and execute follow up actions
            }
        }
    }

    public activeNonBlockingDialogues() {
        return wrapArraySet(this.gameState.activeNonBlockingDialogues).map(id => this.getCachedActionNode(id));
    }

    private addNonBlockingDialogue(action: StartDialogueActionModel) {
        this.removeNonBlockingDialog(action.$modelId);

        this.gameState.addNonBlockingDialog(action.$modelId);

        this.nonBlockingDialogueTimeouts.set(action.$modelId, setTimeout(() => this.removeNonBlockingDialog(action.$modelId), gameConstants.nonBlockingDialogueRemoveTimeMS));
    }

    public removeNonBlockingDialog(actionId: string) {
        const timeoutId = this.nonBlockingDialogueTimeouts.get(actionId);
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        this.gameState.activeNonBlockingDialogues.delete(actionId);
    }

    public activeDialogueOrDescription() {
        return this.getCachedActionNode(Array.from(this.gameState.waitingForDialogueAnswerSelection)[0]);
    }

    public availableDialogueAnswers() {
        if (this.gameState.waitingForDialogueAnswerSelection.size === 0)
            return [];

        const action = this.activeDialogueOrDescription();
        return action.exits().filter(exit => this.doesConditionHold(exit.hideCondition, action));
    }

    /**
     * If the given value is a 'action tree parameter' - %param% notation - this method returns the
     * actual value to which the parameter is set.
     */
    public resolvePotentialTreeParameter(value: string, treeScopeContext: ActionModel): string {
        const parameterName = parseFormattedTreeParameter(value);
        if (!parameterName)
            return value; // not a parameter

        const tree = getTreeParent(treeScopeContext);
        const parameter = tree?.treeParameterActions()?.find(p => p.name === parameterName);
        if (!parameter)
            return null; // parameter not found

        return this.resolvePotentialTreeParameter(parameter.value.get(gameStore.languageKey, gameStore.playerGender), tree); // parameters can be set to parameters of the parent tree
    }

    private doesConditionHold(condition: ConditionModel, treeScopeContext: ActionModel) {
        if (!condition)
            return true;

        // Check conditions without variables first
        switch (condition.conditionType) {
            case ConditionType.Awareness:
                const awarenessValue = this.gameState.playerAwareness;
                return this.eval(awarenessValue.toString(), condition.operator, condition.value);

            case ConditionType.PlayerHealth:
                return this.eval(this.gameState.playerHealth.toString(), condition.operator, condition.value);
        }

        // The conditions needs a variable. If it is incomplete, it holds.
        if (condition.variableName === "")
            return true;

        switch (condition.conditionType) {
            case ConditionType.PlayStyle:
                const playStyle = this.resolvePotentialTreeParameter(condition.variableName, treeScopeContext);
                return (condition.value && this.gameState.playerPlayStyle === playStyle ||
                    (!condition.value && this.gameState.playerPlayStyle !== playStyle)
                );
            case ConditionType.Tag:
                return (condition.value && this.gameState.playerTags.has(condition.variableName) ||
                    (!condition.value && !this.gameState.playerTags.has(condition.variableName))
                );
            case ConditionType.Item:
                const itemId = this.resolvePotentialTreeParameter(condition.variableName, treeScopeContext);
                return (condition.value && this.gameState.playerInventory.has(itemId) ||
                    (!condition.value && !this.gameState.playerInventory.has(itemId)));

            case ConditionType.ItemWithOneTag:
                const allItemsWithTag = itemStore.getItemsForTag(this.resolvePotentialTreeParameter(condition.variableName, treeScopeContext));
                const playerOwnsItemWithTag = allItemsWithTag.find(item => this.gameState.playerInventory.has(item.id));
                return (condition.value && playerOwnsItemWithTag) || (!condition.value && !playerOwnsItemWithTag);
            case ConditionType.ItemWithOneOfMultipleTags:
                const allItemsWithSomeTag = itemStore.getItemsForSomeTag(condition.variableName.split(" ").map(tag => this.resolvePotentialTreeParameter(tag, treeScopeContext)));
                const playerOwnsItemSomeTag = allItemsWithSomeTag.find(item => this.gameState.playerInventory.has(item.id));
                return (condition.value && playerOwnsItemSomeTag) || (!condition.value && !playerOwnsItemSomeTag);
            case ConditionType.ItemWithMultipleTags:
                const allItemsWithEveryTag = itemStore.getItemsForEveryTag(condition.variableName.split(" ").map(tag => this.resolvePotentialTreeParameter(tag, treeScopeContext)));
                const playerOwnsItemWithEveryTag = allItemsWithEveryTag.find(item => this.gameState.playerInventory.has(item.id));
                return (condition.value && playerOwnsItemWithEveryTag) || (!condition.value && !playerOwnsItemWithEveryTag);

            case ConditionType.Quest:
                const playerHasQuest = this.gameState.hasQuest(this.resolvePotentialTreeParameter(condition.variableName, treeScopeContext));
                return (condition.value && playerHasQuest) || (!condition.value && !playerHasQuest);

            case ConditionType.TreeVariable:
            case ConditionType.GlobalVariable:
                const scope = condition.conditionType === ConditionType.GlobalVariable ? ActionScope.Global : ActionScope.Tree;
                return this.eval(this.gameState.getVariable(condition.variableName, scope, this.rootActionTree, treeScopeContext), condition.operator, condition.value ? condition.value : null);

            case ConditionType.Reputation:
                const reputationValue = this.resolvePotentialTreeParameter(condition.variableName, treeScopeContext) === factions[0]
                    ? this.gameState.playerReputationWindChasers
                    : this.gameState.playerReputationSilverAnchors;
                return this.eval(reputationValue.toString(), condition.operator, condition.value);
        }
    }

    private eval(left: string, op: ConditionOperator, right: string) {
        switch (op) {
            case ConditionOperator.Equals:
                return left == right;
            case ConditionOperator.NotEquals:
                return left != right;
            case ConditionOperator.GreaterThan:
                return Number(left) > Number(right);
            case ConditionOperator.LessThan:
                return Number(left) < Number(right);
        }
    }

    private calculate(calc: CalculateVariableActionModel) {
        const var1 = this.gameState.getVariableAllScopes(calc.variable1, this.rootActionTree, calc);
        const var2 = this.gameState.getVariableAllScopes(calc.variable2, this.rootActionTree, calc);
        switch (calc.operator) {
            case CalculateVariableOperator.Plus:
                return parseInt(var1) + parseInt(var2);
            case CalculateVariableOperator.Minus:
                return parseInt(var1) - parseInt(var2);
            case CalculateVariableOperator.Multiply:
                return parseInt(var1) * parseInt(var2);
            case CalculateVariableOperator.Divide:
                return parseInt(var1) / parseInt(var2);
        }
    }

    public currentCombat() {
        if (this.gameState.waitingForCombatToFinishAction === "")
            return null;

        return this.getCachedActionNode(this.gameState.waitingForCombatToFinishAction) as StartFightActionModel;
    }

    /**
     * Returns 'true' if the player entered an area and should stop there.
     */
    public handleAreaTrigger(triggerId: string, isEnter: boolean) {
        if (isEnter) {
            this.gameState.playerIsInsideTriggers.add(triggerId);
        } else {
            this.gameState.playerIsInsideTriggers.delete(triggerId);
        }

        if (isEnter) {
            this.handleTriggerDamageInArea(triggerId);
        }

        return this.handleLocationTrigger(triggerId, isEnter);
    }

    public handleTriggerDamageInArea(triggerId: string) {
        let lastTrigger: TriggerDamageInAreaActionModel = null;
        for (const actionId of this.gameState.activeTriggerActions) {
            const actionModel = this.getCachedActionNode(actionId);
            if (actionModel instanceof TriggerDamageInAreaActionModel) {
                const mapElement = resolvePotentialMapElementTreeParameter(actionModel.mapElement, "actions/AreaTriggerValueModel", actionModel);
                if (mapElement.mapId === this.gameState.currentMap && mapElement.elementId == triggerId) {
                    lastTrigger = actionModel;
                }
            }
        }

        if (lastTrigger) {
            this.damagePlayerWithTriggerDamageInArea(lastTrigger);
        }
    }

    public get activeLocationTriggerNamesOnCurrentMap() {
        const triggers = new Set<string>();

        for (const actionId of this.gameState.activeTriggerActions) {
            const actionModel = this.getCachedActionNode(actionId);
            if (actionModel instanceof LocationTriggerActionModel) {
                const mapElement = resolvePotentialMapElementTreeParameter(actionModel.mapElement, "actions/AreaTriggerValueModel", actionModel);
                if (mapElement.mapId === this.gameState.currentMap) {
                    triggers.add(mapElement.elementId);
                }
            }
        }

        return triggers;
    }

    /**
     * Returns 'true' if the player entered an area and should stop there.
     */
    public handleLocationTrigger(triggerId: string, isEnter: boolean) {
        const triggers = new Array<LocationTriggerActionModel>();
        for (const actionId of this.gameState.activeTriggerActions) {
            const actionModel = this.getCachedActionNode(actionId);
            if (actionModel instanceof LocationTriggerActionModel) {
                const mapElement = resolvePotentialMapElementTreeParameter(actionModel.mapElement, "actions/AreaTriggerValueModel", actionModel);
                if (mapElement.mapId === this.gameState.currentMap && mapElement.elementId == triggerId) {
                    triggers.push(actionModel);
                }
            }
        }
        if (!triggers.length)
            return false;

        const trigger = lastElement(triggers);
        if (isEnter === trigger.triggerOnEnter) {
            for (const trigger of triggers) {
                this.gameState.activeTriggerActions.delete(trigger.$modelId);
            }
            this.executeActions(trigger.exitTrigger, trigger);
            return trigger.triggerOnEnter && trigger.stopPlayerPath;
        }

        return false;
    }

    public handleInteractionTrigger(interactionElement: string) {
        let triggerFound: InteractionTriggerActionModel = null;
        const triggersToDelete: InteractionTriggerActionModel[] = [];

        for (const actionId of this.gameState.activeTriggerActions) {
            const potentialTrigger = this.getCachedActionNode(actionId);
            if (potentialTrigger instanceof InteractionTriggerActionModel) {
                const mapElement = resolvePotentialMapElementTreeParameter(potentialTrigger.triggerElement, "actions/InteractionTriggerValueModel", potentialTrigger);
                if (mapElement.mapId === this.gameState.currentMap && mapElement.elementId === interactionElement) {
                    triggersToDelete.push(potentialTrigger);
                    // later triggers override earlier ones for the same interactive map element
                    triggerFound = potentialTrigger;
                }
            }
        }
        for (const trigger of triggersToDelete) {
            this.gameState.activeTriggerActions.delete(trigger.$modelId);
        }

        if (triggerFound) {
            this.executeActions(triggerFound.triggeredActions, triggerFound);
        }
    }

    public handleConditionTrigger() {
        const triggersFound: ConditionTriggerActionModel[] = [];

        for (const actionId of this.gameState.activeTriggerActions) {
            const potentialTrigger = this.getCachedActionNode(actionId);
            if (potentialTrigger instanceof ConditionTriggerActionModel) {
                if (this.doesConditionHold(potentialTrigger.condition, potentialTrigger)) {
                    triggersFound.push(potentialTrigger);
                }
            }
        }
        for (const trigger of triggersFound) {
            this.gameState.activeTriggerActions.delete(trigger.$modelId);
        }
        for (const trigger of triggersFound) {
            this.executeActions(trigger.triggeredActions, trigger);
        }
    }

    public handleUseItemTrigger(itemId: string) {
        const allActiveItemTriggers = UseItemTriggerActionModel.findByItemId(gameStore.gameEngine.searchActiveTriggerNodes(), itemId);
        const trigger = lastElement(allActiveItemTriggers);
        if (!trigger) return;
        allActiveItemTriggers.forEach(t => this.gameState.activeTriggerActions.delete(t.$modelId));
        this.executeActions(trigger.exits()[0], trigger);
    }

    public markPreviousDialogueAnswerForSelection() {
        if (this.gameState.currentDialogueSelection > 0)
            this.gameState.setCurrentDialogueSelection(this.gameState.currentDialogueSelection - 1);
    }

    public markNextDialogueAnswerForSelection() {
        const numberOfAnswers = this.availableDialogueAnswers().length;
        if (numberOfAnswers === 0)
            return;

        if (this.gameState.currentDialogueSelection < numberOfAnswers - 1)
            this.gameState.setCurrentDialogueSelection(this.gameState.currentDialogueSelection + 1);
    }

    public selectDialogueAnswer(index: number) {
        if (this.gameState.waitingForDialogueAnswerSelection.size === 0)
            return false;
        gameStore.addLog(LogEntry.byDialogAnswer(index));
        const dialogAction = this.activeDialogueOrDescription();
        const exit = this.availableDialogueAnswers()[index];
        this.gameState.waitingForDialogueAnswerSelection.delete(Array.from(this.gameState.waitingForDialogueAnswerSelection)[0]);
        this.gameState.setCurrentDialogueSelection(0);
        soundCache.playOneOf(UiSounds.DIALOG_ANSWER);
        this.executeActions(exit, dialogAction);
        return true;
    }

    public progressWhenCharacterReachedTile(characterId: string, mapMarkersAtPlayerPosition: DynamicMapElementMapMarkerInterface[]) {
        [...this.gameState.waitingForCharacterToReachTileActions].forEach(actionId => {
            const action = this.getCachedActionNode(actionId);
            if (action instanceof MoveMapElementActionModel) {
                for (const mapMarker of mapMarkersAtPlayerPosition) {
                    const markerReference = resolvePotentialMapElementTreeParameter(action.targetMapMarker, "actions/MapMarkerValueModel", action);
                    const elementReference = resolvePotentialMapElementTreeParameter(action.mapElement, undefined, action);
                    if (elementReference.elementId === characterId && mapMarker.$modelId === markerReference.elementId) {
                        const npcFrom = this.loadedMap.npcs.find(npc => npc.$modelId === characterId);
                        npcFrom.setNPCDataPosition(mapMarker.position);
                        this.gameState.waitingForCharacterToReachTileActions.delete(action.$modelId);
                        this.executeActions(action.nextActions, action);
                    }
                }
            }
            if (action instanceof MovePlayerActionModel) {
                for (const mapMarker of mapMarkersAtPlayerPosition) {
                    const markerReference = resolvePotentialMapElementTreeParameter(action.targetMapMarker, "actions/MapMarkerValueModel", action);
                    if ("Player" === characterId && mapMarker.$modelId === markerReference.elementId) {
                        this.gameState.waitingForCharacterToReachTileActions.delete(action.$modelId);
                        this.executeActions(action.nextActions, action);
                    }
                }
            }
        });
    }

    public progressAfterCombat() {
        const combat = this.currentCombat();
        if (!combat)
            return false;

        this.gameState.setWaitingForCombatToFinishAction("");
        this.executeActions(this.gameState.playerHealth > 0 ? combat.win : combat.loose, combat);
        return true;
    }

    public closeActiveImage() {
        if (!this.gameState.activeImage)
            return;

        const activeImageAction = this.getCachedActionNode(this.gameState.activeImage) as ShowImageActionModel;
        this.gameState.setActiveImage("");
        if (activeImageAction) {
            this.executeActions(activeImageAction.imageClosed, activeImageAction);
        }
    }

    private startOrResetTimer(action: StartTimerActionModel) {
        const timeS = +this.resolveIntoConcreteValue(action, action.time);
        this.gameState.activeTimers.set(action.$modelId, timeS);

        if (action.visible) {
            if (this.gameState.visibleRunningTimer) { // there is a visible timer running already, replace
                this.gameState.activeTimers.delete(this.gameState.visibleRunningTimer);
                clearTimeout(this.timerTimeouts.get(this.gameState.visibleRunningTimer));
                this.timerTimeouts.delete(this.gameState.visibleRunningTimer);
            }
            this.gameState.setVisibleRunningTimer(action.$modelId);
        }

        const timeFractionalPartS = timeS % 1;
        let firstTickLengthMS = 1000;
        if (timeS <= 0) {
            // Time is 0 (or less). Trigger immediately.
            firstTickLengthMS = 0;
        } else if (timeFractionalPartS > 0) {
            // Time has a decimal point. First trigger should be a fraction of a second instead.
            firstTickLengthMS = timeFractionalPartS * 1000;
        }
        const timerTimeoutId = setTimeout(() => { this.countDownTimer(action.$modelId); }, firstTickLengthMS);
        this.timerTimeouts.set(action.$modelId, timerTimeoutId);
    }

    private countDownTimer(timerNodeId: string) {
        let timeLeft = this.gameState.activeTimers.get(timerNodeId);
        if ((timeLeft % 1) > 0) {
            timeLeft = Math.floor(timeLeft);
        } else {
            timeLeft--;
        }
        this.gameState.activeTimers.set(timerNodeId, timeLeft);
        if (this.gameState.activeTimers.get(timerNodeId) > 0) {
            const timerTimeoutId = setTimeout(() => { this.countDownTimer(timerNodeId); }, 1000);
            this.timerTimeouts.set(timerNodeId, timerTimeoutId);
            return;
        }
        this.timerTimeouts.delete(timerNodeId);

        const activeTimerAction = this.getCachedActionNode(timerNodeId) as StartTimerActionModel;
        if (this.gameState.visibleRunningTimer === timerNodeId)
            this.gameState.setVisibleRunningTimer("");
        this.gameState.activeTimers.delete(timerNodeId);
        this.executeActions(activeTimerAction.finished, activeTimerAction);
    }

    public update(deltaTimeS: number) {
        this.updateTimers(
            deltaTimeS,
            this.gameState.notObservable.activeTriggerDamageInAreaDelays,
            this.startTriggerDamageInAreaActionDamaging
        );
        this.updateTimers(
            deltaTimeS,
            this.gameState.notObservable.activeTriggerDamageInAreaDurations,
            (action: TriggerDamageInAreaActionModel) => this.finishTriggerDamageInAreaActionDamaging(action, false)
        );
        this.updateTimers(
            deltaTimeS,
            this.gameState.notObservable.activePlayAnimationActionNodeTimers,
            this.finishPlayAnimationActionNode
        );
    }

    private updateTimers<T extends ActionModel>(deltaTimeS: number, timers: Map<string, number>, executer: (action: T) => void) {
        let elapsedActionIds: string[] = null;

        for (const [actionId, timeLeft] of timers) {
            const newTimeLeft = timeLeft - deltaTimeS;
            if (newTimeLeft <= 0) {
                if (!elapsedActionIds) {
                    elapsedActionIds = [actionId];
                } else {
                    elapsedActionIds.push(actionId);
                }
            } else {
                timers.set(actionId, newTimeLeft);
            }
        }

        if (elapsedActionIds) {
            // First, remove all timers that are elapsed now
            for (const actionId of elapsedActionIds) {
                timers.delete(actionId);
            }

            // Then execute them
            for (const actionId of elapsedActionIds) {
                executer(this.getCachedActionNode(actionId));
            }
        }
    }

    private startPlayAnimationActionNode(action: PlayAnimationActionModel) {
        const resolvedAnimationElementReference = resolvePotentialMapElementTreeParameter(action.animationElement, "actions/AnimationElementValueModel", action) as AnimationElementReferenceModel;
        const animationElement = this.loadedMap?.animationElements.find(element => element.$modelId === resolvedAnimationElementReference.elementId);

        // Go up the tree to find where the animationName/loop was selected
        // This is the case when we find an AnimationElementReferenceModel that...
        // - ...is pointing directly to an animation
        // - ...is pointing to a parameter with hasRequiredAnimationNames === true
        let currentReferenceWithAnimationName = action.animationElement;
        let currentReferenceAction: ActionModel = action;
        while (true) {
            const parameterName = parseFormattedTreeParameter(action.animationElement.elementId);

            // Pointing directly to an animation
            if (!parameterName)
                break;

            const parent = getTreeParent(currentReferenceAction);
            const parameter = parent?.treeParameterActions("actions/AnimationElementValueModel")?.find(p => p.name === parameterName)?.value as AnimationElementValueModel;

            // Pointing to a parameter that wasn't found, or to one with hasRequiredAnimationNames === true
            if (!parameter || parameter.hasRequiredAnimationNames)
                break;

            currentReferenceWithAnimationName = parameter.value;
            currentReferenceAction = parent;
        }

        const { animationName, loop } = currentReferenceWithAnimationName;

        if (animationName !== "") {
            const animationDuration = animationElement?.playAnimation(animationName, loop, true);

            if (!loop && (action.exitAnimationFinished.nextActions.length > 0)) {
                this.gameState.notObservable.activePlayAnimationActionNodeTimers.set(action.$modelId, animationDuration);
            }
        }

        this.executeActions(action.nextActions, action);
    }

    private finishPlayAnimationActionNode(action: PlayAnimationActionModel) {
        this.executeActions(action.exitAnimationFinished, action);
    }

    private startTriggerDamageInAreaAction(action: TriggerDamageInAreaActionModel) {
        // Skip if this node is already working
        if (this.gameState.notObservable.activeTriggerDamageInAreaDelays.has(action.$modelId) ||
            this.gameState.notObservable.activeTriggerDamageInAreaDurations.has(action.$modelId))
            return;

        this.executeActions(action.exitNodeActivated, action);

        const delay = +this.resolveIntoConcreteValue(action, action.delay);
        this.gameState.notObservable.activeTriggerDamageInAreaDelays.set(action.$modelId, delay);

        this.damageInAreaVisualManager?.startCountdown(action, delay, delay);
    }

    private startTriggerDamageInAreaActionDamaging(action: TriggerDamageInAreaActionModel) {
        this.executeActions(action.exitStartedTriggering, action);

        const mapElement = resolvePotentialMapElementTreeParameter(action.mapElement, "actions/AreaTriggerValueModel", action);
        const playerIsOnTrigger = (mapElement.mapId === this.gameState.currentMap) && this.gameState.playerIsInsideTriggers.has(mapElement.elementId);
        if (playerIsOnTrigger) {
            this.damagePlayerWithTriggerDamageInArea(action);
        }

        const duration = +this.resolveIntoConcreteValue(action, action.duration);
        if (duration > 0) {
            this.gameState.activeTriggerActions.add(action.$modelId);
            this.gameState.notObservable.activeTriggerDamageInAreaDurations.set(action.$modelId, duration);
            this.damageInAreaVisualManager?.startTriggering(action);
        } else {
            this.finishTriggerDamageInAreaActionDamaging(action, true);
        }
    }

    private finishTriggerDamageInAreaActionDamaging(action: TriggerDamageInAreaActionModel, zeroDuration: boolean) {
        this.gameState.activeTriggerActions.delete(action.$modelId);
        this.damageInAreaVisualManager?.finish(action, zeroDuration);

        this.executeActions(action.exitFinishedTriggering, action);
    }

    private damagePlayerWithTriggerDamageInArea(action: TriggerDamageInAreaActionModel) {
        const damage = +this.resolveIntoConcreteValue(action, action.damage);

        this.onPlayerDamaged();

        this.gameState.setPlayerHealth(Math.max(0, this.gameState.playerHealth - damage));

        this.executeActions(action.exitDamagedPlayer, action);

        this.handleConditionTrigger();
    }

    private cancelOngoingMoveMapElementActions(elementId: string) {
        let removeList: Array<string>;

        for (const actionId of this.gameState.waitingForCharacterToReachTileActions) {
            const action = this.getCachedActionNode(actionId);
            if (action instanceof MoveMapElementActionModel) {
                const elementReference = resolvePotentialMapElementTreeParameter(action.mapElement, undefined, action);
                if (elementReference.elementId === elementId) {
                    if (!removeList) {
                        removeList = [actionId];
                    } else {
                        removeList.push(actionId);
                    }
                }
            }
        }

        if (removeList) {
            for (const actionId of removeList) {
                this.gameState.waitingForCharacterToReachTileActions.delete(actionId);
            }
        }
    }

    private deactivateNodesByGroupId(targetDeactivationGroupId: string) {
        runInAction(() => {
            const deactivateTriggerIds = new Array<string>();
            for (const triggerId of this.gameState.activeTriggerActions) {
                const trigger = this.getCachedActionNode(triggerId);

                // TriggerDamageInAreaActionModel are actively doing things, despite being
                // triggers - we should not remove them.
                if (trigger instanceof TriggerDamageInAreaActionModel)
                    continue;

                if (trigger.deactivationGroupId === targetDeactivationGroupId) {
                    deactivateTriggerIds.push(triggerId);
                }
            }

            for (const triggerId of deactivateTriggerIds) {
                this.gameState.activeTriggerActions.delete(triggerId);
            }

            this.gameState.deactivatedDeactivationGroupIds.add(targetDeactivationGroupId);
        });
    }

    /**
     * Resolves a value (that is potentially a tree parameter or a variable) into the concrete
     * value that is behind it.
     *
     * @param action The action node the value comes from
     * @param inputValue The value inside the action node
     * @returns The concrete value after resolving potential tree parameters and variables
     */
    private resolveIntoConcreteValue(action: ActionModel, inputValue: string) {
        let result = this.resolvePotentialTreeParameter(inputValue, action);
        const timeVariableName = parseVariableNotation(result);
        if (timeVariableName)
            result = findVariableValue(timeVariableName, this.rootActionTree, action);

        return result;
    }

    public dispose() {
        this.timerTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.nonBlockingDialogueTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.wasDisposed = true;

        sharedStore.restoreMainGameRootActionTreesAfterGame();
        sharedStore.restoreTreeAccessAssignments();
    }
}
