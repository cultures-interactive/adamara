///<reference types="webpack-env" />
import { ActionTreeModel } from "../../../shared/action/ActionTreeModel";
import { GameEngine } from "../../../client/gameengine/GameEngine";
import { GameStateModel } from "../../../client/gameengine/GameStateModel";
import { ActionScope, ConditionActionModel, SetVariableActionModel } from "../../../shared/action/ActionModel";
import { ConditionType } from "../../../shared/action/ConditionModel";

test("a condition branches the tree (if false)", () => {
    const condition = new ConditionActionModel({});
    condition.condition.setConditionType(ConditionType.Quest);
    condition.condition.setVariableName("Quest1ModelId");
    condition.condition.setValue("1"); // Check of quest is active
    const tree = createTree(condition);

    const gameState = new GameStateModel({});
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.variables.size).toEqual(1);
    expect(gameState.variables.get("result")).toEqual("no");
});

test("a condition branches the tree (if true)", () => {
    const condition = new ConditionActionModel({});
    condition.condition.setConditionType(ConditionType.Quest);
    condition.condition.setVariableName("Quest1ModelId");
    condition.condition.setValue("1"); // Check of quest is active
    const tree = createTree(condition);

    const gameState = new GameStateModel({});
    gameState.playerQuestLog.add("Quest1ModelId"); // Start quest
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.variables.size).toEqual(1);
    expect(gameState.variables.get("result")).toEqual("yes");
});

function createTree(condition: ConditionActionModel) {
    const tree = new ActionTreeModel({});
    const trueAction = new SetVariableActionModel({ scope: ActionScope.Global, name: "result", value: "yes" });
    const falseAction = new SetVariableActionModel({ scope: ActionScope.Global, name: "result", value: "no" });
    tree.addNonSubtreeAction(condition);
    tree.addNonSubtreeAction(trueAction);
    tree.addNonSubtreeAction(falseAction);
    tree.enterActions[0].enterActions.addNextAction(condition.$modelId);
    condition.conditionTrue.addNextAction(trueAction.$modelId);
    condition.conditionFalse.addNextAction(falseAction.$modelId);
    return tree;
}
