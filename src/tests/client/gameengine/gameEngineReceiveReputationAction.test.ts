///<reference types="webpack-env" />
import { ActionTreeModel } from "../../../shared/action/ActionTreeModel";
import { GameEngine } from "../../../client/gameengine/GameEngine";
import { GameStateModel } from "../../../client/gameengine/GameStateModel";
import { factions, ReceiveReputationActionModel, reputationAmounts } from "../../../shared/action/ActionModel";

test("reputation gained on one side is lost on the other (land seeker)", () => {
    const gameState = stateWithReputation(50);
    const tree = createTree(factions[0], reputationAmounts[0]);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.playerReputationWindChasers).toEqual(65);
    expect(gameState.playerReputationSilverAnchors).toEqual(35);
});

test("reputation gained on one side is lost on the other (water stayer)", () => {
    const gameState = stateWithReputation(50);
    const tree = createTree(factions[1], reputationAmounts[1]);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.playerReputationWindChasers).toEqual(42.5);
    expect(gameState.playerReputationSilverAnchors).toEqual(57.5);
});

test("reputation cannot be below zero (land seeker)", () => {
    const gameState = stateWithReputation(5);
    const tree = createTree(factions[1], reputationAmounts[2]);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.playerReputationWindChasers).toEqual(0);
    expect(gameState.playerReputationSilverAnchors).toEqual(26);
});

test("reputation cannot be below zero (water stayer)", () => {
    const gameState = stateWithReputation(5);
    const tree = createTree(factions[0], reputationAmounts[2]);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.playerReputationWindChasers).toEqual(26);
    expect(gameState.playerReputationSilverAnchors).toEqual(0);
});

test("reputation cannot be above 100 (land seeker)", () => {
    const gameState = stateWithReputation(98);
    const tree = createTree(factions[0], reputationAmounts[0]);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.playerReputationWindChasers).toEqual(100);
    expect(gameState.playerReputationSilverAnchors).toEqual(78.2);
});


test("reputation cannot be above 100 (water stayer)", () => {
    const gameState = stateWithReputation(98);
    const tree = createTree(factions[1], reputationAmounts[0]);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.playerReputationWindChasers).toEqual(78.2);
    expect(gameState.playerReputationSilverAnchors).toEqual(100);
});

function stateWithReputation(initalAmount: number) {
    return new GameStateModel({ playerReputationWindChasers: initalAmount, playerReputationSilverAnchors: initalAmount });
}

function createTree(faction: string, amount: string) {
    const tree = new ActionTreeModel({});
    const receiveReputation = new ReceiveReputationActionModel({ fraction: faction, amount });
    tree.addNonSubtreeAction(receiveReputation);
    tree.enterActions[0].enterActions.addNextAction(receiveReputation.$modelId);
    return tree;
}
