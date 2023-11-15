import { ActionTreeModel } from "../../../shared/action/ActionTreeModel";
import { GameEngine } from "../../../client/gameengine/GameEngine";
import { GameStateModel } from "../../../client/gameengine/GameStateModel";
import { ActionScope, SetVariableActionModel, StartDialogueActionModel } from "../../../shared/action/ActionModel";

test("global variable and tree variables each have their own scope", () => {
    const rootTree = new ActionTreeModel({});
    const subTree1 = createTree();
    const subTree2 = createTree();
    const confirmation = new StartDialogueActionModel({}); // something to stop the tree
    subTree1.setParentModelId(rootTree.$modelId);
    subTree2.setParentModelId(rootTree.$modelId);
    rootTree.addNonSubtreeAction(confirmation);

    rootTree.enterActions[0].enterActions.addNextAction(subTree1.enterActions[0].$modelId);
    subTree1.exitActions[0].subTreeExit.addNextAction(confirmation.$modelId);
    confirmation.addAnswer().addNextAction(subTree2.enterActions[0].$modelId);

    addSetVariableToTree(subTree1, "var1", ActionScope.Global, "t1");
    addSetVariableToTree(subTree1, "var1", ActionScope.Tree, "t1");

    addSetVariableToTree(subTree2, "var1", ActionScope.Global, "t2");
    addSetVariableToTree(subTree2, "var1", ActionScope.Tree, "t2");

    const gameState = new GameStateModel({});
    const gameEngine = new GameEngine(rootTree, [subTree1, subTree2], gameState);
    gameEngine.start();

    expect(gameState.variables.size).toEqual(2);
    expect(gameState.getVariable("var1", ActionScope.Global, rootTree, subTree1.allActions[0])).toEqual("t1");
    expect(gameState.getVariable("var1", ActionScope.Tree, rootTree, subTree1.allActions[0])).toEqual("t1");

    gameEngine.selectDialogueAnswer(0);

    expect(gameState.variables.size).toEqual(3);
    expect(gameState.getVariable("var1", ActionScope.Global, rootTree, subTree1.allActions[0])).toEqual("t2");
    expect(gameState.getVariable("var1", ActionScope.Global, rootTree, subTree2.allActions[0])).toEqual("t2");
    expect(gameState.getVariable("var1", ActionScope.Tree, rootTree, subTree1.allActions[0])).toEqual("t1");
    expect(gameState.getVariable("var1", ActionScope.Tree, rootTree, subTree2.allActions[0])).toEqual("t2");
});

function createTree() {
    const tree = new ActionTreeModel({});
    tree.enterActions[0].enterActions.addNextAction(tree.exitActions[0].$modelId);
    return tree;
}

function addSetVariableToTree(tree: ActionTreeModel, varName: string, varScope: ActionScope, varValue: string) {
    const varAction = new SetVariableActionModel({ name: varName, scope: varScope, value: varValue });
    tree.addNonSubtreeAction(varAction);
    tree.enterActions[0].enterActions.addNextAction(varAction.$modelId);
}