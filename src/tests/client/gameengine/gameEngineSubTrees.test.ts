import { ActionTreeModel } from "../../../shared/action/ActionTreeModel";
import { GameEngine } from "../../../client/gameengine/GameEngine";
import { GameStateModel } from "../../../client/gameengine/GameStateModel";
import { ActionScope, ConditionActionModel, SetVariableActionModel, TreeEnterActionModel } from "../../../shared/action/ActionModel";
import { ConditionType } from "../../../shared/action/ConditionModel";

test("a subtree may have multiple entries", () => {
    const { tree, subTrees } = createTree();

    const gameState = new GameStateModel({});
    let gameEngine = new GameEngine(tree, subTrees, gameState);
    gameEngine.start();

    expect(gameState.variables.get("check")).toEqual("entry0");

    gameState.playerInventory.add("TestItem");
    gameEngine = new GameEngine(tree, subTrees, gameState);
    gameEngine.start();

    expect(gameState.variables.get("check")).toEqual("entry1");
});

function createTree() {
    const tree = new ActionTreeModel({});
    const condition = new ConditionActionModel({});
    const subTree = new ActionTreeModel({});
    subTree.addNonSubtreeAction(new TreeEnterActionModel({}));

    tree.addNonSubtreeAction(condition);
    subTree.setParentModelId(tree.$modelId);
    tree.enterActions[0].enterActions.addNextAction(condition.$modelId);

    condition.condition.setConditionType(ConditionType.Item);
    condition.condition.setVariableName("TestItem");
    condition.condition.setValue("1");
    condition.conditionFalse.addNextAction(subTree.enterActions[0].$modelId);
    condition.conditionTrue.addNextAction(subTree.enterActions[1].$modelId);

    const e0 = new SetVariableActionModel({ name: "check", value: "entry0", scope: ActionScope.Global });
    const e1 = new SetVariableActionModel({ name: "check", value: "entry1", scope: ActionScope.Global });
    subTree.addNonSubtreeAction(e0);
    subTree.addNonSubtreeAction(e1);

    subTree.enterActions[0].enterActions.addNextAction(e0.$modelId);
    subTree.enterActions[1].enterActions.addNextAction(e1.$modelId);

    return {
        tree,
        subTrees: [subTree]
    };
}
