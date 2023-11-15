///<reference types="webpack-env" />
import { ActionTreeModel } from "../../../shared/action/ActionTreeModel";
import { GameEngine } from "../../../client/gameengine/GameEngine";
import { GameStateModel } from "../../../client/gameengine/GameStateModel";
import { ItemSelectionMode, LooseItemActionModel } from "../../../shared/action/ActionModel";
import { ItemModel } from "../../../shared/game/ItemModel";
import { itemStore } from "../../../client/stores/ItemStore";

test("items are removed from inventory (mode = Item, allItems = false)", () => {
    const gameState = fillInventory();
    const tree = createTree(ItemSelectionMode.Item, "Fish", false);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect([...gameState.playerInventory]).toEqual(["Cheese", "Neglace", "Perl", "Tropy"]);
});

test("items are removed from inventory (mode = Item, allItems = true)", () => {
    const gameState = fillInventory();
    const tree = createTree(ItemSelectionMode.Item, "Perl", true);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect([...gameState.playerInventory]).toEqual(["Cheese", "Fish", "Neglace", "Tropy"]);
});

test("items are removed from inventory (mode = ItemWithOneTag, allItems = false)", () => {
    const gameState = fillInventory();
    const tree = createTree(ItemSelectionMode.ItemWithOneTag, "tasty", false);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.playerInventory.size).toEqual(4);
    expect([...gameState.playerInventory]).toContainEqual("Neglace");
    expect([...gameState.playerInventory]).toContainEqual("Perl");
    expect([...gameState.playerInventory]).toContainEqual("Tropy");
});

test("items are removed from inventory (mode = ItemWithOneTag, allItems = true)", () => {
    const gameState = fillInventory();
    const tree = createTree(ItemSelectionMode.ItemWithOneTag, "shiny", true);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect([...gameState.playerInventory]).toEqual(["Cheese", "Fish"]);
});

test("items are removed from inventory (mode = ItemWithOneOfMultipleTags, allItems = false)", () => {
    const gameState = fillInventory();
    const tree = createTree(ItemSelectionMode.ItemWithOneOfMultipleTags, "tasty yellow", false);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.playerInventory.size).toEqual(4);
    expect([...gameState.playerInventory]).toContainEqual("Neglace");
    expect([...gameState.playerInventory]).toContainEqual("Perl");
});

test("random items are removed from inventory (mode = ItemWithOneOfMultipleTags, allItems = false), even if not all possible items are in the inventory", () => {
    for (let i = 0; i < 100; i++) {
        const gameState = fillInventory();
        gameState.playerInventory.delete("Cheese");
        const tree = createTree(ItemSelectionMode.ItemWithOneOfMultipleTags, "tasty yellow", false);
        const gameEngine = new GameEngine(tree, [], gameState);
        gameEngine.start();

        expect(gameState.playerInventory.size).toEqual(3);
        expect([...gameState.playerInventory]).toContainEqual("Neglace");
        expect([...gameState.playerInventory]).toContainEqual("Perl");
    }
});

test("having no matching item does not lead to a crash (mode = ItemWithOneOfMultipleTags, allItems = false)", () => {
    const gameState = fillInventory();
    const tree = createTree(ItemSelectionMode.ItemWithOneOfMultipleTags, "something", false);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.playerInventory.size).toEqual(5);
    expect([...gameState.playerInventory]).toContainEqual("Neglace");
    expect([...gameState.playerInventory]).toContainEqual("Perl");
});

test("items are removed from inventory (mode = ItemWithOneOfMultipleTags, allItems = true)", () => {
    const gameState = fillInventory();
    const tree = createTree(ItemSelectionMode.ItemWithOneOfMultipleTags, "shiny yellow", true);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect([...gameState.playerInventory]).toEqual(["Fish"]);
});

test("items are removed from inventory (mode = ItemWithMultipleTags, allItems = false)", () => {
    const gameState = fillInventory();
    const tree = createTree(ItemSelectionMode.ItemWithMultipleTags, "tasty stinky", false);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect(gameState.playerInventory.size).toEqual(4);
    expect([...gameState.playerInventory]).toContainEqual("Neglace");
    expect([...gameState.playerInventory]).toContainEqual("Perl");
    expect([...gameState.playerInventory]).toContainEqual("Tropy");
});

test("items are removed from inventory (mode = ItemWithMultipleTags, allItems = true)", () => {
    const gameState = fillInventory();
    const tree = createTree(ItemSelectionMode.ItemWithMultipleTags, "tasty stinky", true);
    const gameEngine = new GameEngine(tree, [], gameState);
    gameEngine.start();

    expect([...gameState.playerInventory]).toEqual(["Neglace", "Perl", "Tropy"]);
});

function fillInventory() {
    itemStore.setItem(new ItemModel({ id: "Cheese", tags: ["stinky", "tasty", "yellow"] }));
    itemStore.setItem(new ItemModel({ id: "Fish", tags: ["stinky", "tasty"] }));
    itemStore.setItem(new ItemModel({ id: "Neglace", tags: ["shiny"] }));
    itemStore.setItem(new ItemModel({ id: "Perl", tags: ["shiny"] }));
    itemStore.setItem(new ItemModel({ id: "Tropy", tags: ["shiny", "yellow", "stinky"] }));

    const gameState = new GameStateModel({});
    itemStore.getAllItems.forEach(item => gameState.playerInventory.add(item.id));
    return gameState;
}

function createTree(selectionMode: ItemSelectionMode, itemIdOrTags: string, allItems: boolean) {
    const tree = new ActionTreeModel({});
    const looseItems = new LooseItemActionModel({
        selectionMode, itemId: itemIdOrTags, allItems
    });
    tree.addNonSubtreeAction(looseItems);
    tree.enterActions[0].enterActions.addNextAction(looseItems.$modelId);
    return tree;
}
