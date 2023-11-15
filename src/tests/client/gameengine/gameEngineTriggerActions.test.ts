import { ActionTreeModel } from "../../../shared/action/ActionTreeModel";
import { GameEngine } from "../../../client/gameengine/GameEngine";
import { GameStateModel } from "../../../client/gameengine/GameStateModel";
import { ActionModel, ActionScope, ConditionTriggerActionModel, InteractionTriggerActionModel, LocationTriggerActionModel, SetVariableActionModel } from "../../../shared/action/ActionModel";
import { ConditionType } from "../../../shared/action/ConditionModel";

test("a location trigger fires when player enters an area", () => {
    const trigger = new LocationTriggerActionModel({});
    trigger.mapElement.setMapId(10);
    trigger.mapElement.setElementId("triggerArea");
    const tree = createTree(trigger, (actionId) => trigger.exitTrigger.addNextAction(actionId));

    const gameState = new GameStateModel({});
    gameState.setCurrentMap(10);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.activeTriggerActions.size).toEqual(1);
    expect(gameState.variables.size).toEqual(0);

    // Player reaches the area
    gameEngine.handleLocationTrigger("triggerArea", true);

    expect(gameState.activeTriggerActions.size).toEqual(0);
    expect(gameState.variables.size).toEqual(1);
});

test("a location trigger fires when player leaves an area", () => {
    const trigger = new LocationTriggerActionModel({});
    trigger.mapElement.setMapId(10);
    trigger.mapElement.setElementId("triggerArea");
    trigger.setTriggerOnEnter(false);
    const tree = createTree(trigger, (actionId) => trigger.exitTrigger.addNextAction(actionId));

    const gameState = new GameStateModel({});
    gameState.setCurrentMap(10);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.activeTriggerActions.size).toEqual(1);
    expect(gameState.variables.size).toEqual(0);

    // Player reaches the area
    gameEngine.handleLocationTrigger("triggerArea", true);

    expect(gameState.activeTriggerActions.size).toEqual(1);

    // Player leaves the area
    gameEngine.handleLocationTrigger("triggerArea", false);

    expect(gameState.activeTriggerActions.size).toEqual(0);
});

test("a location trigger does not fire when player is on wrong map", () => {
    const trigger = new LocationTriggerActionModel({});
    trigger.mapElement.setMapId(10);
    trigger.mapElement.setElementId("triggerArea");
    const tree = createTree(trigger, trigger.exitTrigger.addNextAction.bind(trigger.exitTrigger));

    const gameState = new GameStateModel({});
    gameState.setCurrentMap(15); // player on different map than trigger
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.activeTriggerActions.size).toEqual(1);
    expect(gameState.variables.size).toEqual(0);

    // Player reaches the area
    gameEngine.handleLocationTrigger("triggerArea", true);

    // State unchanged
    expect(gameState.activeTriggerActions.size).toEqual(1);
    expect(gameState.variables.size).toEqual(0);
});

test("an interaction trigger fires on interaction with interactive element", () => {
    const trigger = new InteractionTriggerActionModel({});
    trigger.triggerElement.setMapId(10);
    trigger.triggerElement.setElementId("interactiveMapElement");
    const tree = createTree(trigger, (actionId) => trigger.triggeredActions.addNextAction(actionId));

    const gameState = new GameStateModel({});
    gameState.setCurrentMap(10);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.activeTriggerActions.size).toEqual(1);
    expect(gameState.variables.size).toEqual(0);

    // Player clicks on the map element
    gameEngine.handleInteractionTrigger("interactiveMapElement");

    expect(gameState.activeTriggerActions.size).toEqual(0);
    expect(gameState.variables.size).toEqual(1);
});

test("an interaction trigger does not fire on interaction with another interactive element", () => {
    const trigger = new InteractionTriggerActionModel({});
    trigger.triggerElement.setMapId(10);
    trigger.triggerElement.setElementId("interactiveMapElement");
    const tree = createTree(trigger, (actionId) => trigger.triggeredActions.addNextAction(actionId));

    const gameState = new GameStateModel({});
    gameState.setCurrentMap(10);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.activeTriggerActions.size).toEqual(1);
    expect(gameState.variables.size).toEqual(0);

    // Player reaches the area
    gameEngine.handleInteractionTrigger("otherInteractiveMapElement");

    // State unchanged
    expect(gameState.activeTriggerActions.size).toEqual(1);
    expect(gameState.variables.size).toEqual(0);
});

test("an condition trigger fires once condition holds", () => {
    const trigger = new ConditionTriggerActionModel({});
    trigger.condition.setConditionType(ConditionType.Quest);
    trigger.condition.setVariableName("Quest1ModelId");
    trigger.condition.setValue("1"); // Quest active
    const tree = createTree(trigger, (actionId) => trigger.triggeredActions.addNextAction(actionId));

    const gameState = new GameStateModel({});
    gameState.setCurrentMap(10);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.activeTriggerActions.size).toEqual(1);
    expect(gameState.variables.size).toEqual(0);

    gameEngine.handleConditionTrigger();

    // State unchanged
    expect(gameState.activeTriggerActions.size).toEqual(1);
    expect(gameState.variables.size).toEqual(0);

    // activate quest
    gameState.playerQuestLog.add("Quest1ModelId");

    gameEngine.handleConditionTrigger();

    expect(gameState.activeTriggerActions.size).toEqual(0);
    expect(gameState.variables.size).toEqual(1);
});

test("a new location trigger removes active triggers at the same location", () => {
    const trigger = new LocationTriggerActionModel({});
    trigger.mapElement.setMapId(10);
    trigger.mapElement.setElementId("triggerArea");
    const tree = createTree(trigger, (actionId) => trigger.exitTrigger.addNextAction(actionId), "originalTrigger");

    const overridingTrigger = new LocationTriggerActionModel({});
    overridingTrigger.mapElement.setMapId(10);
    overridingTrigger.mapElement.setElementId("triggerArea");
    const subTree = createTree(overridingTrigger, (actionId) => overridingTrigger.exitTrigger.addNextAction(actionId), "overrideTrigger");

    subTree.setParentModelId(tree.$modelId);
    tree.enterActions[0].enterActions.addNextAction(subTree.enterActions[0].$modelId);

    const gameState = new GameStateModel({});
    gameState.setCurrentMap(10);
    const gameEngine = new GameEngine(tree, [subTree], gameState);
    gameEngine.start();

    expect(gameState.activeTriggerActions.size).toEqual(2);
    expect(gameState.variables.size).toEqual(0);

    // Player reaches the area
    gameEngine.handleLocationTrigger("triggerArea", true);
    trigger.mapElement.setElementId("");
    // Player reaches the area again
    gameEngine.handleLocationTrigger("triggerArea", true);

    expect(gameState.activeTriggerActions.size).toEqual(0);
    expect(gameState.variables.size).toEqual(1);
    expect([...gameState.variables.keys()][0]).toEqual("overrideTrigger"); // "originalTrigger" is never reached
});

test("a new interaction trigger removes active triggers for the same interactive element", () => {
    const trigger = new InteractionTriggerActionModel({});
    trigger.triggerElement.setMapId(10);
    trigger.triggerElement.setElementId("interactiveMapElement");
    const tree = createTree(trigger, (actionId) => trigger.triggeredActions.addNextAction(actionId), "originalTrigger");

    const overridingTrigger = new InteractionTriggerActionModel({});
    overridingTrigger.triggerElement.setMapId(10);
    overridingTrigger.triggerElement.setElementId("interactiveMapElement");
    const subTree = createTree(overridingTrigger, (actionId) => overridingTrigger.triggeredActions.addNextAction(actionId), "overrideTrigger");

    subTree.setParentModelId(tree.$modelId);
    tree.enterActions[0].enterActions.addNextAction(subTree.enterActions[0].$modelId);

    const gameState = new GameStateModel({});
    gameState.setCurrentMap(10);
    const gameEngine = new GameEngine(tree, [subTree], gameState);
    gameEngine.start();

    expect(gameState.activeTriggerActions.size).toEqual(2);
    expect(gameState.variables.size).toEqual(0);

    // Player clicks on the map element
    gameEngine.handleInteractionTrigger("interactiveMapElement");
    // Player clicks on the map element again
    gameEngine.handleInteractionTrigger("interactiveMapElement");

    expect(gameState.activeTriggerActions.size).toEqual(0);
    expect(gameState.variables.size).toEqual(1);
    expect([...gameState.variables.keys()][0]).toEqual("overrideTrigger"); // "originalTrigger" is never reached
});

function createTree(trigger: ActionModel, exitAdder: (actionId: string) => void, variableToCheck: string = "dummy") {
    const tree = new ActionTreeModel({});
    const afterTriggerAction = new SetVariableActionModel({ scope: ActionScope.Global, name: variableToCheck, value: "dummy" });
    tree.addNonSubtreeAction(trigger);
    tree.addNonSubtreeAction(afterTriggerAction);
    tree.enterActions[0].enterActions.addNextAction(trigger.$modelId);
    exitAdder(afterTriggerAction.$modelId);
    return tree;
}
