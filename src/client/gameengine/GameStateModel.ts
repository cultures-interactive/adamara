import { arraySet, Model, model, modelAction, objectMap, prop } from "mobx-keystone";
import { ActionModel, ActionScope, factions, ItemSelectionMode, LocationTriggerActionModel, LooseItemActionModel, MovePlayerActionModel, playStyles, ReceiveQuestActionModel, ReceiveReputationActionModel, ReceiveTaskActionModel, SimpleCutSceneActionModel } from "../../shared/action/ActionModel";
import { ActionTreeModel } from "../../shared/action/ActionTreeModel";
import Graph from "node-dijkstra";
import { MapElementReferenceModel } from "../../shared/action/MapElementReferenceModel";
import { SimpleCutSceneProperties } from "../canvas/game/controller/CutSceneController";
import { combatStore } from "../stores/CombatStore";
import { gameStore } from "../stores/GameStore";
import { itemStore } from "../stores/ItemStore";
import { resolvePotentialMapElementTreeParameter } from "../helper/treeParameterHelpers";
import { ReputationDeltaValueModelKey } from "../../shared/game/GameDesignVariablesModel";

const taskColors = [
    0xe6194b,
    0x3cb44b,
    0xffe119,
    0x4363d8,
    0xf58231,
    0x911eb4,
    0x46f0f0,
    0xf032e6,
    0xbcf60c,
    0xfabebe,
    0x008080,
    0xe6beff,
    0x9a6324,
    0xfffac8,
    0x800000,
    0xaaffc3,
    0x808000,
    0xffd8b1,
    0x000075,
    0x808080
];

class NotObservableGameState {
    public activePlayAnimationActionNodeTimers = new Map<string, number>();
    public activeTriggerDamageInAreaDelays = new Map<string, number>();
    public activeTriggerDamageInAreaDurations = new Map<string, number>();
}

@model("game/GameStateModel")
export class GameStateModel extends Model({
    currentMap: prop<number>(0).withSetter(),
    // loadedMaps: prop(() => objectMap<ReadonlyMapData>()),

    variables: prop(() => objectMap<string>()),
    playerHealth: prop<number>(100).withSetter(),
    playerPlayStyle: prop<string>(playStyles[0]).withSetter(),
    playerTags: prop(() => arraySet<string>()),
    playerInventory: prop(() => arraySet<string>()),
    playerQuestLog: prop(() => arraySet<string>()),
    playerQuestLogTasks: prop(() => objectMap<number>()), // value is the color of the task
    playerReputationWindChasers: prop<number>(0).withSetter(),
    playerReputationSilverAnchors: prop<number>(0).withSetter(),
    playerReputationStatus: prop<string>("").withSetter(),
    playerAwareness: prop<number>(0).withSetter(),
    defeatedEnemies: prop(() => arraySet<string>()),

    currentAct: prop<number>(1).withSetter(),

    activeTriggerActions: prop(() => arraySet<string>()),
    waitingForDialogueAnswerSelection: prop(() => arraySet<string>()),
    waitingForCharacterToReachTileActions: prop(() => arraySet<string>()),
    waitingForCombatToFinishAction: prop<string>("").withSetter(),

    currentDialogueSelection: prop<number>(0).withSetter(), // Which dialogue answer is currently highlighted (accessibility mode)

    activeNonBlockingDialogues: prop(() => arraySet<string>()), // These will eventually be shown as speech bubbles on characters
    activeText: prop<string>("").withSetter(), // constantly shown in a specific place in the UI
    activeImage: prop<string>("").withSetter(),

    activeTimers: prop(() => objectMap<number>()),
    visibleRunningTimer: prop<string>("").withSetter(),

    playerIsInsideTriggers: prop(() => arraySet<string>()),

    actionPropertyUIVisible: prop<boolean>(true).withSetter(),
    actionPropertyMovementPossible: prop<boolean>(true).withSetter(),
    actionPropertyOverlayOpacity: prop<number>(0).withSetter(),
    actionPropertyCurrentCutScene: prop<SimpleCutSceneProperties>(null).withSetter(),
    actionPropertyCurrentCutSceneTextIndex: prop<number>(0).withSetter(),
    actionPropertyEmergencyLightOverlayOpacity: prop<number>(0).withSetter(),

    deactivatedDeactivationGroupIds: prop(() => arraySet<string>())
}) {

    public notObservable = new NotObservableGameState();

    @modelAction
    public setVariable(name: string, scope: ActionScope, value: string, rootActionTree: ActionTreeModel, treeScopeContext: ActionModel) {
        this.variables.set(rootActionTree.scopedName(name, scope, treeScopeContext), value);
    }

    /**
     * Finds the variable with the given name and scope
     */
    public getVariable(name: string, scope: ActionScope, rootActionTree: ActionTreeModel, treeScopeContext: ActionModel) {
        return this.variables.get(rootActionTree.scopedName(name, scope, treeScopeContext));
    }

    /**
     * Finds the variable with the given name looking first in the tree scope, and if not found, in the global scope.
     */
    public getVariableAllScopes(name: string, rootActionTree: ActionTreeModel, treeScopeContext: ActionModel) {
        const inTreeScope = this.getVariable(name, ActionScope.Tree, rootActionTree, treeScopeContext);
        if (inTreeScope)
            return inTreeScope;

        return this.getVariable(name, ActionScope.Global, rootActionTree, treeScopeContext);
    }

    @modelAction
    public addQuest(quest: ReceiveQuestActionModel) {
        this.playerQuestLog.add(quest.$modelId);
    }

    @modelAction
    public deleteQuest(questModelId: string, getCachedNode: (modelId: string) => ActionModel) {
        [...this.playerQuestLogTasks.keys()].forEach(taskActionId => {
            const taskQuestId = (getCachedNode(taskActionId) as ReceiveTaskActionModel)?.questId;
            if (taskQuestId == questModelId) {
                this.playerQuestLogTasks.delete(taskActionId);
            }
        });
        return this.playerQuestLog.delete(questModelId);
    }

    public hasQuest(questModelId: string) {
        return this.playerQuestLog.has(questModelId);
    }

    @modelAction
    public addTask(task: ReceiveTaskActionModel) {
        this.playerQuestLogTasks.set(task.$modelId, this.nextTaskColor(task));
    }

    @modelAction
    public deleteTask(taskModelId: string) {
        return this.playerQuestLogTasks.delete(taskModelId);
    }

    public hasTask(taskModelId: string) {
        return this.playerQuestLogTasks.has(taskModelId);
    }

    private nextTaskColor(task: ReceiveTaskActionModel) {
        if (!task.isTaskWithLocation())
            return 0; // no location - color is not used

        for (const color of taskColors) {
            // find the first unused color
            if (![...this.playerQuestLogTasks.values()].includes(color)) {
                return color;
            }
        }
        return taskColors[0]; // all colors used
    }

    @modelAction
    public addNonBlockingDialog(modelId: string) {
        this.activeNonBlockingDialogues.add(modelId);
    }

    @modelAction
    public looseItem(action: LooseItemActionModel, itemTags: string[], item: string): string[] {
        const { selectionMode } = action;

        let items: string[];

        if (itemTags.length > 0) {
            // Item(s) addressed by Item Tag(s)
            items = (selectionMode === ItemSelectionMode.ItemWithOneOfMultipleTags
                ? itemStore.getItemsForSomeTag(itemTags)
                : itemStore.getItemsForEveryTag(itemTags)
            ).map(i => i.id).filter(id => this.playerInventory.has(id));
        } else {
            // Item addressed directly by Item ID
            if (this.playerInventory.has(item)) {
                items = [item];
            } else {
                return [];
            }
        }

        if (action.allItems) {
            // Delete all items
            items.forEach(itemId => this.playerInventory.delete(itemId));
            return items;
        }

        if (items.length > 0) {
            // Randomly select one item to delete
            const lostItem = items[Math.floor(Math.random() * items.length)];
            this.playerInventory.delete(lostItem);
            return [lostItem];
        }

        return [];
    }

    public receiveReputation(action: ReceiveReputationActionModel, findTreeParameterValue: (value: string, treeScopeContext: ActionModel) => string) {
        if (this.currentAct < 1 || this.currentAct > gameStore.gameDesignVariables.reputationActBalance.length) {
            throw new Error("Trying to fetch reputationActBalance value for act that does not exist.");
        }
        const forWindChasers = findTreeParameterValue(action.fraction, action) === factions[0];
        const reputationValue = gameStore.gameDesignVariables.reputationAmountBalance[action.amount as ReputationDeltaValueModelKey];
        const relevantFactionCurrentReputation = forWindChasers ? this.playerReputationWindChasers : this.playerReputationSilverAnchors;
        const amountDelta = reputationValue * gameStore.gameDesignVariables.reputationActBalance[this.currentAct - 1] + reputationValue * ((relevantFactionCurrentReputation / 100) / gameStore.gameDesignVariables.reputationBalanceFactor);
        if (!amountDelta)
            return;

        // cap between 0% and 100%
        const newSilverAnchorsAmount = Math.max(0, Math.min(100, this.playerReputationSilverAnchors + (forWindChasers ? -amountDelta : amountDelta)));
        const newWindChasersAmount = Math.max(0, Math.min(100, this.playerReputationWindChasers + (forWindChasers ? amountDelta : -amountDelta)));

        this.setPlayerReputationSilverAnchors(newSilverAnchorsAmount);
        this.setPlayerReputationWindChasers(newWindChasersAmount);
    }

    /**
     * Change health by the given amount, but not below 'min'
     */
    @modelAction
    public changePlayerHealth(amount: number, min: number = 0) {
        if (!amount)
            return;

        // if this goes to 0, reset/respawn in Game.ts is triggered
        this.playerHealth = Math.max(min, Math.min(combatStore.config.playerHealth, this.playerHealth + amount));
    }

    @modelAction
    public resetPlayerHealth() {
        this.playerHealth = combatStore.config.playerHealth;
    }

    /**
     * Searches breadth-first all exits of fromNode for a MovePlayerActionModel node, ignoring loops.
     * Returns the target mapId if it finds a MovePlayerActionModel in the first maxNodesToInspect nodes
     * it inspects (excluding fromNode), else null.
     */
    private findMovePlayerAction(fromNode: ActionModel, rootActionTree: ActionTreeModel, maxNodesToInspect: number) {
        const queuedNodeIds = [fromNode];
        const seenNodeIds = new Set([fromNode.$modelId]);
        let nodesLeft = maxNodesToInspect;

        while ((queuedNodeIds.length > 0) && (nodesLeft >= 0)) {
            nodesLeft--;
            const node = queuedNodeIds.shift();
            for (const exit of node.exits()) {
                for (const nextId of exit.nextActions) {
                    if (seenNodeIds.has(nextId))
                        continue;

                    const nextNode = gameStore.gameEngine.getCachedActionNode(nextId);
                    if (!nextNode)
                        continue;

                    if (nextNode instanceof MovePlayerActionModel) {
                        const targetMapMarker = resolvePotentialMapElementTreeParameter(nextNode.targetMapMarker, "actions/MapMarkerValueModel", nextNode);
                        return targetMapMarker.mapId;
                    }

                    seenNodeIds.add(nextId);
                    queuedNodeIds.push(nextNode);
                }
            }
        }

        return null;
    }

    /**
     * Finds a transition place to another map if it exists.
     * Transitions are all 'move player' actions which are 'next actions' of an active 'area trigger'.
     * If the player needs to move across multiple maps to reach the target, this method returns
     * the first transition place the player needs to reach.
     */
    public findTransitionToMap(toMap: number, rootActionTree: ActionTreeModel) {
        // Discover all active map transitions on all maps
        const allTransitions = new Map<string, Map<string, number>>();
        const currentMapTransitions = new Map<number, MapElementReferenceModel>();
        for (const triggerActionId of this.activeTriggerActions) {
            const trigger = gameStore.gameEngine.getCachedActionNode(triggerActionId);
            if (!(trigger instanceof LocationTriggerActionModel))
                continue;

            const triggerMapElement = resolvePotentialMapElementTreeParameter(trigger.mapElement, "actions/AreaTriggerValueModel", trigger) as MapElementReferenceModel;

            const toMapId = this.findMovePlayerAction(trigger, rootActionTree, 25);
            if (!toMapId)
                continue;

            const fromMapId = triggerMapElement.mapId;
            if (fromMapId === toMapId)
                continue;

            const from = "" + fromMapId;
            const to = "" + toMapId;
            if (!allTransitions.has(from)) {
                allTransitions.set(from, new Map());
            }
            if (!allTransitions.has(to)) {
                allTransitions.set(to, new Map());
            }
            allTransitions.get(from).set(to, 1);

            if (fromMapId === this.currentMap) {
                currentMapTransitions.set(toMapId, triggerMapElement);
            }
        }

        // Find the shortest path to the target map to determine the next map to move to
        const pathToTarget = new Graph(allTransitions).path("" + this.currentMap, "" + toMap) as string[];

        if (pathToTarget?.length >= 2) {
            // This is the next map, which is the place where we are going to show the marker
            const nextMapId = parseInt(pathToTarget[1]);
            return currentMapTransitions.get(nextMapId);
        }

        return null;
    }
}
