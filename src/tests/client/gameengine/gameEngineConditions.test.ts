import { ActionModel, ActionScope, factions, playStyles, ReceiveAwarenessActionModel, ReceiveItemActionModel, ReceiveQuestActionModel, ReceiveReputationActionModel, reputationAmounts, SetPlayStyleActionModel, SetTagActionModel, SetVariableActionModel, StartDialogueActionModel } from "../../../shared/action/ActionModel";
import { ActionTreeModel } from "../../../shared/action/ActionTreeModel";
import { ConditionOperator, ConditionType } from "../../../shared/action/ConditionModel";
import { GameEngine } from "../../../client/gameengine/GameEngine";
import { GameStateModel } from "../../../client/gameengine/GameStateModel";


test("if a tag was not set, an answer with the corresponding 'not set' condition is available", () => {
    const dialogue = new StartDialogueActionModel({});

    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Tag);
    a0.hideCondition.setVariableName("HavingFun");
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue(""); // not set

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if a tag was not set, an answer with the corresponding 'set' condition is not available", () => {
    const dialogue = new StartDialogueActionModel({});

    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Tag);
    a0.hideCondition.setVariableName("HavingFun");
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue("1"); // set

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("if a tag was set, an answer with the corresponding 'not set' condition is not available", () => {
    const tag = new SetTagActionModel({});
    const dialogue = new StartDialogueActionModel({});

    tag.setTag("HavingFun");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Tag);
    a0.hideCondition.setVariableName("HavingFun");
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue(""); // not set

    const gameEngine = new GameEngine(tree([tag, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("if a tag was set, an answer with the corresponding 'set' condition is available", () => {
    const tag = new SetTagActionModel({});
    const dialogue = new StartDialogueActionModel({});

    tag.setTag("HavingFun");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Tag);
    a0.hideCondition.setVariableName("HavingFun");
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue("1"); // set

    const gameEngine = new GameEngine(tree([tag, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if an item is not owned, an answer with the corresponding 'owned' condition is not available", () => {
    const dialogue = new StartDialogueActionModel({});

    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Item);
    a0.hideCondition.setVariableName("Showel");
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue("1"); // owned

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("if an item is not owned, an answer with the corresponding 'not owned' condition is available", () => {
    const dialogue = new StartDialogueActionModel({});

    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Item);
    a0.hideCondition.setVariableName("Showel");
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue(""); // not owned

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if an item is owned, an answer with the corresponding 'owned' condition is available", () => {
    const receiveItem = new ReceiveItemActionModel({});
    const dialogue = new StartDialogueActionModel({});

    receiveItem.setItemId("Showel");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Item);
    a0.hideCondition.setVariableName("Showel");
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue("1"); // owned

    const gameEngine = new GameEngine(tree([receiveItem, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if an item is owned, an answer with the corresponding 'not owned' condition is not available", () => {
    const receiveItem = new ReceiveItemActionModel({});
    const dialogue = new StartDialogueActionModel({});

    receiveItem.setItemId("Showel");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Item);
    a0.hideCondition.setVariableName("Showel");
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue(""); // not owned

    const gameEngine = new GameEngine(tree([receiveItem, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("if a quest was not started, an answer with the corresponding 'started' condition is not available", () => {
    const dialogue = new StartDialogueActionModel({});

    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Quest);
    a0.hideCondition.setVariableName("SomeQuestModelId");
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue("1"); // started

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("if a quest was not started, an answer with the corresponding 'not started' condition is available", () => {
    const dialogue = new StartDialogueActionModel({});

    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Quest);
    a0.hideCondition.setVariableName("SomeQuestModelId");
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue(""); // not started

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if a quest was started, an answer with the corresponding 'started' condition is available", () => {
    const dialogue = new StartDialogueActionModel({});
    const quest = new ReceiveQuestActionModel({});

    quest.setQuestId("Fetch the Showel");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Quest);
    a0.hideCondition.setVariableName(quest.$modelId);
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue("1"); // started

    const gameEngine = new GameEngine(tree([quest, dialogue]), [], new GameStateModel({}));
    gameEngine.start();


    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if a quest was started, an answer with the corresponding 'not started' condition is not available", () => {
    const dialogue = new StartDialogueActionModel({});
    const quest = new ReceiveQuestActionModel({});

    quest.setQuestId("Fetch the Showel");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Quest);
    a0.hideCondition.setVariableName(quest.$modelId);
    a0.hideCondition.setOperator(ConditionOperator.Equals);

    a0.hideCondition.setValue(""); // not started

    const gameEngine = new GameEngine(tree([quest, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("if a variable is not set, an answer with a 'variable == ''' condition is available", () => {
    const dialogue = new StartDialogueActionModel({});

    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.TreeVariable);
    a0.hideCondition.setVariableName("var1");
    a0.hideCondition.setOperator(ConditionOperator.Equals);
    a0.hideCondition.setValue(""); // not set

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if a variable is not set, an answer with a 'variable != ''' condition is not available", () => {
    const dialogue = new StartDialogueActionModel({});

    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.TreeVariable);
    a0.hideCondition.setVariableName("var1");
    a0.hideCondition.setOperator(ConditionOperator.NotEquals);
    a0.hideCondition.setValue(""); // not set

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("if a variable is set to a value, an answer with a 'variable == value' condition is available", () => {
    const variable = new SetVariableActionModel({});
    const dialogue = new StartDialogueActionModel({});

    variable.setName("var1");
    variable.setValue("varValue");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.TreeVariable);
    a0.hideCondition.setVariableName("var1");
    a0.hideCondition.setOperator(ConditionOperator.Equals);
    a0.hideCondition.setValue("varValue");

    const gameEngine = new GameEngine(tree([variable, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if a variable is set to a value, an answer with a 'variable == anotherValue' condition is not available", () => {
    const variable = new SetVariableActionModel({});
    const dialogue = new StartDialogueActionModel({});

    variable.setName("var1");
    variable.setValue("varValue");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.TreeVariable);
    a0.hideCondition.setVariableName("var1");
    a0.hideCondition.setOperator(ConditionOperator.Equals);
    a0.hideCondition.setValue("anotherVarValue");

    const gameEngine = new GameEngine(tree([variable, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("if a variable is set to a value, an answer with a 'variable != value' condition is not available", () => {
    const variable = new SetVariableActionModel({});
    const dialogue = new StartDialogueActionModel({});

    variable.setName("var1");
    variable.setValue("varValue");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.TreeVariable);
    a0.hideCondition.setVariableName("var1");
    a0.hideCondition.setOperator(ConditionOperator.NotEquals);
    a0.hideCondition.setValue("varValue");

    const gameEngine = new GameEngine(tree([variable, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("if a variable is set to a value, an answer with a 'variable != anotherValue' condition is available", () => {
    const variable = new SetVariableActionModel({});
    const dialogue = new StartDialogueActionModel({});

    variable.setName("var1");
    variable.setValue("varValue");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.TreeVariable);
    a0.hideCondition.setVariableName("var1");
    a0.hideCondition.setOperator(ConditionOperator.NotEquals);
    a0.hideCondition.setValue("anotherVarValue");

    const gameEngine = new GameEngine(tree([variable, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if a variable has a number value, it can be compared with < to make an answer available", () => {
    const variable = new SetVariableActionModel({});
    const dialogue = new StartDialogueActionModel({});

    variable.setName("var1");
    variable.setValue("4");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.TreeVariable);
    a0.hideCondition.setVariableName("var1");
    a0.hideCondition.setOperator(ConditionOperator.LessThan);
    a0.hideCondition.setValue("8");

    const gameEngine = new GameEngine(tree([variable, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if a variable has a number value, it can be compared with < to make an answer unavailable", () => {
    const variable = new SetVariableActionModel({});
    const dialogue = new StartDialogueActionModel({});

    variable.setName("var1");
    variable.setValue("8");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.TreeVariable);
    a0.hideCondition.setVariableName("var1");
    a0.hideCondition.setOperator(ConditionOperator.LessThan);
    a0.hideCondition.setValue("4");

    const gameEngine = new GameEngine(tree([variable, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("if a variable has a number value, it can be compared with > to make an answer available", () => {
    const variable = new SetVariableActionModel({});
    const dialogue = new StartDialogueActionModel({});

    variable.setName("var1");
    variable.setValue("8");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.TreeVariable);
    a0.hideCondition.setVariableName("var1");
    a0.hideCondition.setOperator(ConditionOperator.GreaterThan);
    a0.hideCondition.setValue("4");

    const gameEngine = new GameEngine(tree([variable, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if a variable has a number value, it can be compared with > to make an answer unavailable", () => {
    const variable = new SetVariableActionModel({});
    const dialogue = new StartDialogueActionModel({});

    variable.setName("var1");
    variable.setValue("4");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.TreeVariable);
    a0.hideCondition.setVariableName("var1");
    a0.hideCondition.setOperator(ConditionOperator.GreaterThan);
    a0.hideCondition.setValue("8");

    const gameEngine = new GameEngine(tree([variable, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("reputation can be compared with < to hide an answer (LandSeeker)", () => {
    const reputation = new ReceiveReputationActionModel({});
    const dialogue = new StartDialogueActionModel({});

    reputation.setFraction(factions[0]);
    reputation.setAmount(reputationAmounts[2]);
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Reputation);
    a0.hideCondition.setVariableName(factions[0]);
    a0.hideCondition.setOperator(ConditionOperator.LessThan);
    a0.hideCondition.setValue("6");

    const gameEngine = new GameEngine(tree([reputation, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("reputation can be compared with > to hide an answer (LandSeeker)", () => {
    const reputation = new ReceiveReputationActionModel({});
    const dialogue = new StartDialogueActionModel({});

    reputation.setFraction(factions[0]);
    reputation.setAmount(reputationAmounts[2]);
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Reputation);
    a0.hideCondition.setVariableName(factions[0]);
    a0.hideCondition.setOperator(ConditionOperator.GreaterThan);
    a0.hideCondition.setValue("30");

    const gameEngine = new GameEngine(tree([reputation, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("reputation can be compared with < to hide an answer (WaterStayer)", () => {
    const reputation = new ReceiveReputationActionModel({});
    const dialogue = new StartDialogueActionModel({});

    reputation.setFraction(factions[1]);
    reputation.setAmount(reputationAmounts[2]);
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Reputation);
    a0.hideCondition.setVariableName(factions[1]);
    a0.hideCondition.setOperator(ConditionOperator.LessThan);
    a0.hideCondition.setValue("6");

    const gameEngine = new GameEngine(tree([reputation, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("reputation can be compared with > to hide an answer (WaterStayer)", () => {
    const reputation = new ReceiveReputationActionModel({});
    const dialogue = new StartDialogueActionModel({});

    reputation.setFraction(factions[1]);
    reputation.setAmount(reputationAmounts[2]);
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Reputation);
    a0.hideCondition.setVariableName(factions[1]);
    a0.hideCondition.setOperator(ConditionOperator.GreaterThan);
    a0.hideCondition.setValue("30");

    const gameEngine = new GameEngine(tree([reputation, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("awareness can be compared with < to hide an answer (20 < 10)", () => {
    const awareness = new ReceiveAwarenessActionModel({});
    const dialogue = new StartDialogueActionModel({});

    awareness.setAmount("20");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Awareness);
    a0.hideCondition.setOperator(ConditionOperator.LessThan);
    a0.hideCondition.setValue("10");

    const gameEngine = new GameEngine(tree([awareness, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("awareness can be compared with < to show an answer (20 < 30)", () => {
    const awareness = new ReceiveAwarenessActionModel({});
    const dialogue = new StartDialogueActionModel({});

    awareness.setAmount("20");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Awareness);
    a0.hideCondition.setOperator(ConditionOperator.LessThan);
    a0.hideCondition.setValue("30");

    const gameEngine = new GameEngine(tree([awareness, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("awareness can be compared with > to hide an answer (20 > 30)", () => {
    const awareness = new ReceiveAwarenessActionModel({});
    const dialogue = new StartDialogueActionModel({});

    awareness.setAmount("20");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Awareness);
    a0.hideCondition.setOperator(ConditionOperator.GreaterThan);
    a0.hideCondition.setValue("30");

    const gameEngine = new GameEngine(tree([awareness, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("awareness can be compared with > to show an answer (20 > 10)", () => {
    const awareness = new ReceiveAwarenessActionModel({});
    const dialogue = new StartDialogueActionModel({});

    awareness.setAmount("20");
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.Awareness);
    a0.hideCondition.setOperator(ConditionOperator.GreaterThan);
    a0.hideCondition.setValue("10");

    const gameEngine = new GameEngine(tree([awareness, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("player health can be compared with < to hide an answer (100 < 90)", () => {
    const dialogue = new StartDialogueActionModel({});
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.PlayerHealth);
    a0.hideCondition.setOperator(ConditionOperator.LessThan);
    a0.hideCondition.setValue("90");

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("player health can be compared with < to show an answer (100 < 110)", () => {
    const dialogue = new StartDialogueActionModel({});
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.PlayerHealth);
    a0.hideCondition.setOperator(ConditionOperator.LessThan);
    a0.hideCondition.setValue("110");

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("player health can be compared with > to hide an answer (100 > 110)", () => {
    const dialogue = new StartDialogueActionModel({});
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.PlayerHealth);
    a0.hideCondition.setOperator(ConditionOperator.GreaterThan);
    a0.hideCondition.setValue("110");

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("player health can be compared with > to show an answer (100 > 90)", () => {
    const dialogue = new StartDialogueActionModel({});
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.PlayerHealth);
    a0.hideCondition.setOperator(ConditionOperator.GreaterThan);
    a0.hideCondition.setValue("90");

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if a play style was chosen, an answer with the corresponding 'selected' condition is available", () => {
    const selectPlayStyle = new SetPlayStyleActionModel({});
    const dialogue = new StartDialogueActionModel({});

    selectPlayStyle.setPlayStyle(playStyles[1]);
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.PlayStyle);
    a0.hideCondition.setVariableName(playStyles[1]);

    a0.hideCondition.setValue("1"); // selected

    const gameEngine = new GameEngine(tree([selectPlayStyle, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if a play style was chosen, an answer with the corresponding 'not selected' condition not is available", () => {
    const selectPlayStyle = new SetPlayStyleActionModel({});
    const dialogue = new StartDialogueActionModel({});

    selectPlayStyle.setPlayStyle(playStyles[1]);
    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.PlayStyle);
    a0.hideCondition.setVariableName(playStyles[1]);

    a0.hideCondition.setValue(""); // not selected

    const gameEngine = new GameEngine(tree([selectPlayStyle, dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

test("if a play style was not yet chosen, an answer with the corresponding 'selected' condition is available", () => {
    const dialogue = new StartDialogueActionModel({});

    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.PlayStyle);
    a0.hideCondition.setVariableName(playStyles[0]);

    a0.hideCondition.setValue("1"); // selected

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([a0]);
});

test("if a play style was not yet chosen, an answer with the corresponding 'not selected' condition not is available", () => {
    const dialogue = new StartDialogueActionModel({});

    const a0 = dialogue.addAnswer();
    a0.toggleHideConditionActive();
    a0.hideCondition.setConditionType(ConditionType.PlayStyle);
    a0.hideCondition.setVariableName(playStyles[0]);

    a0.hideCondition.setValue(""); // not selected

    const gameEngine = new GameEngine(tree([dialogue]), [], new GameStateModel({}));
    gameEngine.start();

    expect(gameEngine.availableDialogueAnswers()).toEqual([]);
});

function tree(actions: ActionModel[]) {
    const tree = new ActionTreeModel({});
    actions.forEach(action => {
        tree.addNonSubtreeAction(action);
        tree.enterActions[0].enterActions.addNextAction(action.$modelId);
    });
    return tree;
}