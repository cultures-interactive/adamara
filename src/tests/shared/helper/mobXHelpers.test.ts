/* eslint-disable prefer-const */
import { arrayActions, clone, fromSnapshot, getSnapshot, model, Model, modelAction, objectMap, prop, SnapshotOutOf } from "mobx-keystone";
import { TranslatedError } from "../../../shared/definitions/errors/TranslatedError";
import { applyPatchIfValueWasNotChanged, AugmentedPatch, AugmentedPatchAddOperation, AugmentedPatchRemoveOperation, AugmentedPatchReplaceOperation, checkAndApplyAllPatchesOrThrow, onPatchesImproved, PatchCheckResult, realizePath, tryMergePatchesWithSamePath } from "../../../shared/helper/mobXHelpers";

@model("test/InnerModel")
export class InnerModel extends Model({
    someInnerValue: prop<number>().withSetter()
}) {
}

@model("test/MiddleModel")
export class MiddleModel extends Model({
    name: prop<string>().withSetter(),
    middleChildren: prop<InnerModel[]>(() => []),
    someMiddleValue: prop<string>("---").withSetter()
}) {
    @modelAction
    public addMiddleChild() {
        const innerModel = new InnerModel({});
        this.middleChildren.push(innerModel);
        return innerModel;
    }

    @modelAction
    public removeMiddleChild(index: number) {
        this.middleChildren.splice(index, 1);
    }
}


@model("test/OuterModel")
export class OuterModel extends Model({
    someOuterValue: prop<number>(16).withSetter(),
    outerChildren: prop<MiddleModel[]>(() => []),
    stringMap: prop(() => objectMap<string>()),
    stringArray: prop<string[]>(() => []),
    childrenMap: prop(() => objectMap<MiddleModel>())
}) {

    @modelAction
    public addOuterChild(name: string) {
        this.outerChildren.push(new MiddleModel({ name }));
    }

    @modelAction
    public removeOuterChild(index: number) {
        this.outerChildren.splice(index, 1);
    }
}

interface PatchPacket {
    patches: AugmentedPatch[];
    inversePatches: AugmentedPatch[];
}

function onGetPatchesForNextAction(subtreeRoot: any) {
    return new Promise<PatchPacket>(resolve => {
        const stop = onPatchesImproved(
            subtreeRoot,
            (patches, inversePatches) => {
                stop();
                resolve({ patches, inversePatches });
            },
            null
        );
    });
}

test("whole patching loop, all basic operations, forward and inverse", async () => {
    const primaryInstance = new OuterModel({});
    const secondaryInstance = clone(primaryInstance, { generateNewIds: false });
    expect(secondaryInstance).toStrictEqual(primaryInstance);

    const primaryStateSnapshots = new Array<SnapshotOutOf<OuterModel>>();
    const patchPackets = new Array<PatchPacket>();

    // Set value
    let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryStateSnapshots.push(getSnapshot(primaryInstance));
    primaryInstance.setSomeOuterValue(4);
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    let patchPacket = (await patchesForNextActionPromise);
    patchPackets.push(patchPacket);
    expect(patchPacket.patches.length).toBe(1);
    expect(patchPacket.inversePatches.length).toBe(1);
    let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Add element to array
    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryStateSnapshots.push(getSnapshot(primaryInstance));
    primaryInstance.addOuterChild("child1");
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    patchPacket = (await patchesForNextActionPromise);
    patchPackets.push(patchPacket);
    expect(patchPacket.patches.length).toBe(1);
    expect(patchPacket.inversePatches.length).toBe(1);
    result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Add another element to array
    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryStateSnapshots.push(getSnapshot(primaryInstance));
    primaryInstance.addOuterChild("child2");
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    patchPacket = (await patchesForNextActionPromise);
    patchPackets.push(patchPacket);
    expect(patchPacket.patches.length).toBe(1);
    expect(patchPacket.inversePatches.length).toBe(1);
    result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Change element in array
    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryStateSnapshots.push(getSnapshot(primaryInstance));
    primaryInstance.outerChildren[0].setSomeMiddleValue("a rose by another other name");
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    patchPacket = (await patchesForNextActionPromise);
    patchPackets.push(patchPacket);
    expect(patchPacket.patches.length).toBe(1);
    expect(patchPacket.inversePatches.length).toBe(1);
    result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Add element in array element
    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryStateSnapshots.push(getSnapshot(primaryInstance));
    primaryInstance.outerChildren[0].addMiddleChild();
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    patchPacket = (await patchesForNextActionPromise);
    patchPackets.push(patchPacket);
    expect(patchPacket.patches.length).toBe(1);
    expect(patchPacket.inversePatches.length).toBe(1);
    result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Change value in element in array element
    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryStateSnapshots.push(getSnapshot(primaryInstance));
    primaryInstance.outerChildren[0].middleChildren[0].setSomeInnerValue(42341);
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    patchPacket = (await patchesForNextActionPromise);
    patchPackets.push(patchPacket);
    expect(patchPacket.patches.length).toBe(1);
    expect(patchPacket.inversePatches.length).toBe(1);
    result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Remove first element from array
    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryStateSnapshots.push(getSnapshot(primaryInstance));
    primaryInstance.removeOuterChild(0);
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    patchPacket = (await patchesForNextActionPromise);
    patchPackets.push(patchPacket);
    expect(patchPacket.patches.length).toBe(1);
    expect(patchPacket.inversePatches.length).toBe(1);
    result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Remove last element from array
    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryStateSnapshots.push(getSnapshot(primaryInstance));
    primaryInstance.removeOuterChild(0);
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    patchPacket = (await patchesForNextActionPromise);
    patchPackets.push(patchPacket);
    expect(patchPacket.patches.length).toBe(1);
    expect(patchPacket.inversePatches.length).toBe(1);
    result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Go back through all inversePatches
    for (let i = primaryStateSnapshots.length - 1; i >= 0; i--) {
        const previousPrimaryInstance = fromSnapshot<OuterModel>(primaryStateSnapshots[i]);
        const previousPatchPacket = patchPackets[i];

        expect(secondaryInstance).not.toBe(previousPrimaryInstance);
        result = applyPatchIfValueWasNotChanged(secondaryInstance, previousPatchPacket.inversePatches[0], previousPatchPacket.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(secondaryInstance).toStrictEqual(previousPrimaryInstance);
    }
});

test("augmentation: array index change", async () => {
    const primaryInstance = new OuterModel({});
    const secondaryInstance = clone(primaryInstance, { generateNewIds: false });
    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Add first element to array
    let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryInstance.addOuterChild("child1");
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    let patchPacketAddedFirstElement = (await patchesForNextActionPromise);
    expect(patchPacketAddedFirstElement.patches.length).toBe(1);
    expect(patchPacketAddedFirstElement.inversePatches.length).toBe(1);
    let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacketAddedFirstElement.patches[0], patchPacketAddedFirstElement.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Add second element to array
    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    const child2Name = "child2";
    primaryInstance.addOuterChild(child2Name);
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    let patchPacketAddedSecondElement = (await patchesForNextActionPromise);
    expect(patchPacketAddedSecondElement.patches.length).toBe(1);
    expect(patchPacketAddedSecondElement.inversePatches.length).toBe(1);
    result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacketAddedSecondElement.patches[0], patchPacketAddedSecondElement.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Change second element content without executing the patch
    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    const middleValueTarget = "lorem ipsum";
    primaryInstance.outerChildren[1].setSomeMiddleValue(middleValueTarget);
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    let patchPacketChangedSecondElement = (await patchesForNextActionPromise);
    expect(patchPacketAddedSecondElement.patches.length).toBe(1);
    expect(patchPacketAddedSecondElement.inversePatches.length).toBe(1);

    // Check if realizing the patch path right now points at index 1
    const realizedPathBeforeRemoval = realizePath(secondaryInstance, patchPacketChangedSecondElement.patches[0].path);
    expect(realizedPathBeforeRemoval).toStrictEqual(["outerChildren", 1, "someMiddleValue"]);

    // Manually remove first element on both
    expect(secondaryInstance.outerChildren[0].name).not.toBe(child2Name);
    expect(secondaryInstance.outerChildren[0].name).not.toBe(child2Name);
    primaryInstance.removeOuterChild(0);
    secondaryInstance.removeOuterChild(0);
    expect(secondaryInstance.outerChildren[0].name).toBe(child2Name);

    // Check if realizing the patch path after this removal points at index 0 (because the second element is now the first)
    const realizedPathAfterRemoval = realizePath(secondaryInstance, patchPacketChangedSecondElement.patches[0].path);
    expect(realizedPathAfterRemoval).toStrictEqual(["outerChildren", 0, "someMiddleValue"]);

    // Execute the patch and ensure that it changes secondaryInstance.patterns[0].keySequence === "someKeySequence"
    // so that both instances match again
    expect(secondaryInstance.outerChildren[0].someMiddleValue).not.toBe(middleValueTarget);
    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacketChangedSecondElement.patches[0], patchPacketChangedSecondElement.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance.outerChildren[0].someMiddleValue).toBe(middleValueTarget);
    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Check if realizing the patch path fails after removing the element it points to
    const realizedPathAfterRemoval2 = realizePath(secondaryInstance, patchPacketChangedSecondElement.patches[0].path);
    expect(realizedPathAfterRemoval2).toStrictEqual(["outerChildren", 0, "someMiddleValue"]);
    secondaryInstance.removeOuterChild(0);
    expect(() => realizePath(secondaryInstance, patchPacketChangedSecondElement.patches[0].path)).toThrowError("Cannot realize path: a model cannot be found anymore");
});

test("augmentation: replace model instance in array", async () => {
    const primaryInstance = new OuterModel({});
    const childA = new MiddleModel({});
    const childB = new MiddleModel({});

    arrayActions.push(primaryInstance.outerChildren, childA);

    const secondaryInstance = clone(primaryInstance, { generateNewIds: false });
    expect(secondaryInstance).toStrictEqual(primaryInstance);

    let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    expect(primaryInstance.outerChildren[0]).toStrictEqual(childA);
    expect(primaryInstance.outerChildren[0]).not.toStrictEqual(childB);
    expect(primaryInstance.outerChildren.length).toBe(1);

    arrayActions.splice(primaryInstance.outerChildren, 0, 1, childB);

    expect(primaryInstance.outerChildren[0]).not.toStrictEqual(childA);
    expect(primaryInstance.outerChildren[0]).toStrictEqual(childB);
    expect(primaryInstance.outerChildren.length).toBe(1);

    let patchPacketReplace = (await patchesForNextActionPromise);
    expect(patchPacketReplace.patches.length).toBe(1);
    expect(patchPacketReplace.inversePatches.length).toBe(1);

    const secondaryInstanceSnapshotBeforeReplace = getSnapshot(secondaryInstance);

    expect(secondaryInstance).not.toStrictEqual(primaryInstance);

    // Forward: Replace
    let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacketReplace.patches[0], patchPacketReplace.inversePatches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).toStrictEqual(primaryInstance);

    // Inverse: Replace backwards
    result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacketReplace.inversePatches[0], patchPacketReplace.patches[0]);
    expect(result).toBe(PatchCheckResult.Success);

    expect(secondaryInstance).not.toStrictEqual(primaryInstance);
    expect(getSnapshot(secondaryInstance)).toStrictEqual(secondaryInstanceSnapshotBeforeReplace);
});

test("augmentation: augment array changes", async () => {
    const primaryInstance = new OuterModel({});
    const secondaryInstance = clone(primaryInstance, { generateNewIds: false });
    expect(secondaryInstance).toStrictEqual(primaryInstance);

    let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    const childA = new MiddleModel({});
    const childB = new MiddleModel({});

    arrayActions.push(primaryInstance.outerChildren, childA);

    let patchPacketAdd = (await patchesForNextActionPromise);

    expect(patchPacketAdd.patches[0].op).toBe("add");
    expect(patchPacketAdd.patches[0].path).toStrictEqual(["outerChildren", 0]);
    expect(patchPacketAdd.inversePatches[0].op).toBe("remove");
    expect(patchPacketAdd.inversePatches[0].path).toStrictEqual(["outerChildren", { arrayIndex: 0, $modelId: childA.$modelId }]);

    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    arrayActions.splice(primaryInstance.outerChildren, 0, 1, childB);

    let patchPacketReplace = (await patchesForNextActionPromise);

    expect(patchPacketReplace.patches.length).toBe(1);
    expect(patchPacketReplace.patches[0].op).toBe("replace");
    expect(patchPacketReplace.patches[0].path).toStrictEqual(["outerChildren", { arrayIndex: 0, $modelId: childA.$modelId }]);
    expect(patchPacketReplace.inversePatches.length).toBe(1);
    expect(patchPacketReplace.inversePatches[0].op).toBe("replace");
    expect(patchPacketReplace.inversePatches[0].path).toStrictEqual(["outerChildren", { arrayIndex: 0, $modelId: childB.$modelId }]);

    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    arrayActions.splice(primaryInstance.outerChildren, 0, 1);

    let patchPacketRemove = (await patchesForNextActionPromise);

    expect(patchPacketRemove.patches[0].op).toBe("remove");
    expect(patchPacketRemove.patches[0].path).toStrictEqual(["outerChildren", { arrayIndex: 0, $modelId: childB.$modelId }]);
    expect(patchPacketRemove.inversePatches[0].op).toBe("add");
    expect(patchPacketRemove.inversePatches[0].path).toStrictEqual(["outerChildren", 0]);
});

test("augmentation: don't augment object map changes", async () => {
    const primaryInstance = new OuterModel({});
    const secondaryInstance = clone(primaryInstance, { generateNewIds: false });
    expect(secondaryInstance).toStrictEqual(primaryInstance);

    let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryInstance.childrenMap.set("a", new MiddleModel({}));

    let patchPacketAdd = (await patchesForNextActionPromise);

    expect(patchPacketAdd.patches[0].op).toBe("add");
    expect(patchPacketAdd.patches[0].path).toStrictEqual(["childrenMap", "items", "a"]);
    expect(patchPacketAdd.inversePatches[0].op).toBe("remove");
    expect(patchPacketAdd.inversePatches[0].path).toStrictEqual(["childrenMap", "items", "a"]);

    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryInstance.childrenMap.set("a", new MiddleModel({}));

    let patchPacketReplace = (await patchesForNextActionPromise);

    expect(patchPacketReplace.patches[0].op).toBe("replace");
    expect(patchPacketReplace.patches[0].path).toStrictEqual(["childrenMap", "items", "a"]);
    expect(patchPacketReplace.inversePatches[0].op).toBe("replace");
    expect(patchPacketReplace.inversePatches[0].path).toStrictEqual(["childrenMap", "items", "a"]);

    patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

    primaryInstance.childrenMap.delete("a");

    let patchPacketRemove = (await patchesForNextActionPromise);

    expect(patchPacketRemove.patches[0].op).toBe("remove");
    expect(patchPacketRemove.patches[0].path).toStrictEqual(["childrenMap", "items", "a"]);
    expect(patchPacketRemove.inversePatches[0].op).toBe("add");
    expect(patchPacketRemove.inversePatches[0].path).toStrictEqual(["childrenMap", "items", "a"]);
});

describe("checkValue", () => {
    test("replace value (both ErrorValueWasChanged & Success)", async () => {
        const oldValue = 1;

        const primaryInstance = new OuterModel({});
        primaryInstance.setSomeOuterValue(oldValue);
        const secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Set value
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

        primaryInstance.setSomeOuterValue(4);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        let patchPacket = (await patchesForNextActionPromise);
        expect(patchPacket.patches.length).toBe(1);
        expect(patchPacket.inversePatches.length).toBe(1);

        // Change in secondaryInstance in the meantime
        secondaryInstance.setSomeOuterValue(2);

        let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);

        // Change value back
        secondaryInstance.setSomeOuterValue(oldValue);

        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(secondaryInstance).toStrictEqual(primaryInstance);
    });

    test("add element (both ErrorValueWasChanged & Success)", async () => {
        const primaryInstance = new OuterModel({});
        primaryInstance.addOuterChild("child1");
        let secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Add element in array element
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

        primaryInstance.outerChildren[0].addMiddleChild();
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        let patchPacket = (await patchesForNextActionPromise);
        expect(patchPacket.patches.length).toBe(1);
        expect(patchPacket.inversePatches.length).toBe(1);

        const secondaryInstanceSnapshotBeforeAdding = getSnapshot(secondaryInstance);

        let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Add the element again via patch (arrays are allowed to have the same element multiple times)
        expect(secondaryInstance.outerChildren[0].middleChildren.length).toBe(1);
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(secondaryInstance.outerChildren[0].middleChildren.length).toBe(2);
        expect(secondaryInstance.outerChildren[0].middleChildren[0]).toStrictEqual(secondaryInstance.outerChildren[0].middleChildren[1]);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        // Reverse element add
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        // Try add with another element already added to the array
        secondaryInstance.outerChildren[0].addMiddleChild();
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        // Reverse element add
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);

        // Try add with the outer child removed
        secondaryInstance.removeOuterChild(0);
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);
    });

    test("remove element (both ErrorValueWasChanged & Success)", async () => {
        const primaryInstance = new OuterModel({});
        primaryInstance.addOuterChild("child1");
        primaryInstance.outerChildren[0].addMiddleChild();
        primaryInstance.outerChildren[0].addMiddleChild();
        primaryInstance.outerChildren[0].addMiddleChild();
        let secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        const secondInstanceSnapshot = getSnapshot(secondaryInstance);

        // Remove element in array element
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

        primaryInstance.outerChildren[0].removeMiddleChild(1);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        let patchPacket = (await patchesForNextActionPromise);
        expect(patchPacket.patches.length).toBe(1);
        expect(patchPacket.inversePatches.length).toBe(1);

        let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Reverse element removal
        secondaryInstance = fromSnapshot<OuterModel>(secondInstanceSnapshot);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        // Remove all other children - patching should still work
        secondaryInstance.outerChildren[0].removeMiddleChild(2);
        secondaryInstance.outerChildren[0].removeMiddleChild(0);

        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        // Reverse element removal
        secondaryInstance = fromSnapshot<OuterModel>(secondInstanceSnapshot);

        // Remove child that is supposed to be removed
        secondaryInstance.outerChildren[0].removeMiddleChild(1);

        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);

        // Reset again
        secondaryInstance = fromSnapshot<OuterModel>(secondInstanceSnapshot);

        // Change a value in the to-be-removed child
        const child = secondaryInstance.outerChildren[0].middleChildren[1];
        const previousInnerValue = child.someInnerValue;
        child.setSomeInnerValue(previousInnerValue + 1);

        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);

        child.setSomeInnerValue(previousInnerValue);

        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        // Reset again
        secondaryInstance = fromSnapshot<OuterModel>(secondInstanceSnapshot);

        // Remove middle child on the path
        secondaryInstance.removeOuterChild(0);

        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);
    });

    test("double add string objectMap element should result in ErrorValueWasChanged", async () => {
        const primaryInstance = new OuterModel({});
        let secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Add element
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

        primaryInstance.stringMap.set("a", "Test!");
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        let patchPacket = (await patchesForNextActionPromise);
        expect(patchPacket.patches.length).toBe(1);
        expect(patchPacket.inversePatches.length).toBe(1);

        const secondaryInstanceSnapshotBeforeAdding = getSnapshot(secondaryInstance);

        let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Reverse element add
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        // Try add with another element already added to the object map
        secondaryInstance.stringMap.set("b", "Test!");
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        // Reverse element add
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);

        // Try add with the element with the same key already added to the object map
        secondaryInstance.stringMap.set("a", "Test!");
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);

        // Reverse element add
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);

        // Try add with the another element with the same key already added to the object map
        secondaryInstance.stringMap.set("a", "Something else");
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);
    });

    test("double remove string objectMap element should result in ErrorValueWasChanged", async () => {
        const primaryInstance = new OuterModel({});
        primaryInstance.stringMap.set("a", "Test!");
        let secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Remove element
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

        primaryInstance.stringMap.delete("a");
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        let patchPacket = (await patchesForNextActionPromise);
        expect(patchPacket.patches.length).toBe(1);
        expect(patchPacket.inversePatches.length).toBe(1);

        const secondaryInstanceSnapshotBeforeAdding = getSnapshot(secondaryInstance);

        let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Reverse element remove
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        // Try with already removed
        secondaryInstance.stringMap.delete("a");
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);
    });

    test("double add model instance objectMap element should result in ErrorValueWasChanged", async () => {
        const primaryInstance = new OuterModel({});
        let secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Add element
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

        const middleModel = new MiddleModel({});

        primaryInstance.childrenMap.set("a", middleModel);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        let patchPacket = (await patchesForNextActionPromise);
        expect(patchPacket.patches.length).toBe(1);
        expect(patchPacket.inversePatches.length).toBe(1);

        const secondaryInstanceSnapshotBeforeAdding = getSnapshot(secondaryInstance);

        let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Reverse element add
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        // Try add with another element already added to the object map
        secondaryInstance.childrenMap.set("b", new MiddleModel({}));
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        // Reverse element add
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);

        // Try add with the another element with the same key already added to the object map
        secondaryInstance.childrenMap.set("a", new MiddleModel({}));
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);
    });

    test("double remove model instance objectMap element should result in ErrorValueWasChanged", async () => {
        const primaryInstance = new OuterModel({});
        primaryInstance.childrenMap.set("a", new MiddleModel({}));
        let secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Remove element
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

        primaryInstance.childrenMap.delete("a");
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        let patchPacket = (await patchesForNextActionPromise);
        expect(patchPacket.patches.length).toBe(1);
        expect(patchPacket.inversePatches.length).toBe(1);

        const secondaryInstanceSnapshotBeforeAdding = getSnapshot(secondaryInstance);

        let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Reverse element remove
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        // Try with already removed
        secondaryInstance.childrenMap.delete("a");
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);
    });

    test("double add stringArray element should result in Success", async () => {
        const primaryInstance = new OuterModel({});
        let secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Add element
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

        arrayActions.push(primaryInstance.stringArray, "a");
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        let patchPacket = (await patchesForNextActionPromise);
        expect(patchPacket.patches.length).toBe(1);
        expect(patchPacket.inversePatches.length).toBe(1);

        const secondaryInstanceSnapshotBeforeAdding = getSnapshot(secondaryInstance);

        console.log(patchPacket.patches[0], patchPacket.inversePatches[0]);

        let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Reverse element add
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        // Try add with the element already added to the array
        arrayActions.push(secondaryInstance.stringArray, "a");
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        // Reverse element add
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);

        // Try add with the another element already added to the array
        arrayActions.push(secondaryInstance.stringArray, "b");
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);
    });

    test("double remove stringArray element should result in ErrorValueWasChanged", async () => {
        const primaryInstance = new OuterModel({});
        arrayActions.push(primaryInstance.stringArray, "a");
        let secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Remove element
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);

        arrayActions.splice(primaryInstance.stringArray, 0, 1);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        let patchPacket = (await patchesForNextActionPromise);
        expect(patchPacket.patches.length).toBe(1);
        expect(patchPacket.inversePatches.length).toBe(1);

        const secondaryInstanceSnapshotBeforeAdding = getSnapshot(secondaryInstance);

        let result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(secondaryInstance).toStrictEqual(primaryInstance);

        // Reverse element remove
        secondaryInstance = fromSnapshot<OuterModel>(secondaryInstanceSnapshotBeforeAdding);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        // Try with already removed
        arrayActions.splice(secondaryInstance.stringArray, 0, 1);
        result = applyPatchIfValueWasNotChanged(secondaryInstance, patchPacket.patches[0], patchPacket.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);
    });

    test("throw exception on unexpected patch combination", async () => {
        const instance = new OuterModel({});
        const patch: AugmentedPatchAddOperation<number> = {
            op: "add",
            path: ["test"],
            value: 1
        };
        const inversePatch: AugmentedPatchReplaceOperation<number> = {
            op: "replace",
            path: ["test"],
            value: 1
        };
        expect(() => applyPatchIfValueWasNotChanged(instance, patch, inversePatch)).toThrowError("forward 'add' + inverse 'replace' is unexpected. Please report this to Tobias.");
    });

    test("throw exception on unexpected path combination (replace + replace) - simple, and path length doesn't match", async () => {
        const instance = new OuterModel({});
        const patch: AugmentedPatchReplaceOperation<number> = {
            op: "replace",
            path: ["test", "a"],
            value: 1
        };
        const inversePatch: AugmentedPatchReplaceOperation<number> = {
            op: "replace",
            path: ["test"],
            value: 1
        };
        expect(() => applyPatchIfValueWasNotChanged(instance, patch, inversePatch)).toThrowError("Replace path mismatch ([\"test\",\"a\"] vs [\"test\"]). Please report this to Tobias.");
    });

    test("throw exception on unexpected path combination (replace + replace) - augmented, but path length doesn't match", async () => {
        const instance = new OuterModel({});
        const patch: AugmentedPatchReplaceOperation<any> = {
            op: "replace",
            path: ["test", { arrayIndex: 0, $modelId: "a" }],
            value: {
                $modelId: "b"
            }
        };
        const inversePatch: AugmentedPatchReplaceOperation<any> = {
            op: "replace",
            path: ["test"],
            value: {
                $modelId: "a"
            }
        };
        expect(() => applyPatchIfValueWasNotChanged(instance, patch, inversePatch)).toThrowError("Replace path mismatch ([\"test\",{\"arrayIndex\":0,\"$modelId\":\"a\"}] vs [\"test\"]). Please report this to Tobias.");
    });

    test("throw exception on unexpected path combination (replace + replace) - arrayIndex doesn't match", async () => {
        const instance = new OuterModel({});
        const patch: AugmentedPatchReplaceOperation<any> = {
            op: "replace",
            path: ["test", { arrayIndex: 0, $modelId: "a" }],
            value: {
                $modelId: "b"
            }
        };
        const inversePatch: AugmentedPatchReplaceOperation<any> = {
            op: "replace",
            path: ["test", { arrayIndex: 1, $modelId: "b" }],
            value: {
                $modelId: "a"
            }
        };
        expect(() => applyPatchIfValueWasNotChanged(instance, patch, inversePatch)).toThrowError("Replace path mismatch ([\"test\",{\"arrayIndex\":0,\"$modelId\":\"a\"}] vs [\"test\",{\"arrayIndex\":1,\"$modelId\":\"b\"}]). Please report this to Tobias.");
    });

    test("throw exception on unexpected path combination (replace + replace) - $modelIds don't match #1", async () => {
        const instance = new OuterModel({});
        const patch: AugmentedPatchReplaceOperation<any> = {
            op: "replace",
            path: ["test", { arrayIndex: 0, $modelId: "x" }],
            value: {
                $modelId: "b"
            }
        };
        const inversePatch: AugmentedPatchReplaceOperation<any> = {
            op: "replace",
            path: ["test", { arrayIndex: 0, $modelId: "a" }],
            value: {
                $modelId: "a"
            }
        };
        expect(() => applyPatchIfValueWasNotChanged(instance, patch, inversePatch)).toThrowError("Replace path mismatch ([\"test\",{\"arrayIndex\":0,\"$modelId\":\"x\"}] vs [\"test\",{\"arrayIndex\":0,\"$modelId\":\"a\"}]). Please report this to Tobias.");
    });

    test("throw exception on unexpected path combination (replace + replace) - $modelIds don't match #2", async () => {
        const instance = new OuterModel({});
        const patch: AugmentedPatchReplaceOperation<any> = {
            op: "replace",
            path: ["test", { arrayIndex: 0, $modelId: "a" }],
            value: {
                $modelId: "b"
            }
        };
        const inversePatch: AugmentedPatchReplaceOperation<any> = {
            op: "replace",
            path: ["test", { arrayIndex: 0, $modelId: "x" }],
            value: {
                $modelId: "a"
            }
        };
        expect(() => applyPatchIfValueWasNotChanged(instance, patch, inversePatch)).toThrowError("Replace path mismatch ([\"test\",{\"arrayIndex\":0,\"$modelId\":\"a\"}] vs [\"test\",{\"arrayIndex\":0,\"$modelId\":\"x\"}]). Please report this to Tobias.");
    });

    test("don't throw exception on path combination that replaces object (replace + replace)", async () => {
        const instance = new OuterModel({});
        const patch: AugmentedPatchReplaceOperation<any> = {
            op: "replace",
            path: ["test", { arrayIndex: 0, $modelId: "a" }],
            value: {
                $modelId: "b"
            }
        };
        const inversePatch: AugmentedPatchReplaceOperation<any> = {
            op: "replace",
            path: ["test", { arrayIndex: 0, $modelId: "b" }],
            value: {
                $modelId: "a"
            }
        };
        expect(applyPatchIfValueWasNotChanged(instance, patch, inversePatch)).toBe(PatchCheckResult.ErrorValueWasChanged);
    });

    test("throw exception on unexpected path combination (remove + add) - first part is different", async () => {
        const instance = new OuterModel({});
        const patch: AugmentedPatchRemoveOperation = {
            op: "remove",
            path: ["test2", "a"]
        };
        const inversePatch: AugmentedPatchAddOperation<number> = {
            op: "add",
            path: ["test", "a"],
            value: 1
        };
        expect(() => applyPatchIfValueWasNotChanged(instance, patch, inversePatch)).toThrowError("Remove/add path mismatch (relevant parts [\"test2\"] vs [\"test\"]). Please report this to Tobias.");
    });

    test("throw exception on unexpected path combination (remove + add) - length", async () => {
        const instance = new OuterModel({});
        const patch: AugmentedPatchRemoveOperation = {
            op: "remove",
            path: ["test", "a"]
        };
        const inversePatch: AugmentedPatchAddOperation<number> = {
            op: "add",
            path: ["test"],
            value: 1
        };
        expect(() => applyPatchIfValueWasNotChanged(instance, patch, inversePatch)).toThrowError("Remove/add path mismatch (relevant parts [\"test\"] vs []). Please report this to Tobias.");
    });

    test("don't throw exception on expected path combination (remove + add)", async () => {
        const instance = new OuterModel({});
        const patch: AugmentedPatchRemoveOperation = {
            op: "remove",
            path: ["test", "a"]
        };
        const inversePatch: AugmentedPatchAddOperation<number> = {
            op: "add",
            path: ["test", "b"],
            value: 1
        };
        expect(applyPatchIfValueWasNotChanged(instance, patch, inversePatch)).toBe(PatchCheckResult.ErrorValueWasChanged);
    });

    test("don't throw exception on path combination if only the last element is different (remove + add)", async () => {
        const instance = new OuterModel({});
        const patch: AugmentedPatchRemoveOperation = {
            op: "remove",
            path: ["test", { $modelId: "abc", arrayIndex: 0 }]
        };
        const inversePatch: AugmentedPatchAddOperation<number> = {
            op: "add",
            path: ["test", 0],
            value: 1
        };
        const result = applyPatchIfValueWasNotChanged(instance, patch, inversePatch);
        expect(result).toBe(PatchCheckResult.ErrorValueWasChanged);
    });
});

describe("tryMergePatchesWithSamePath", () => {
    test("objectMap: (add -> replace) == add", async () => {
        const primaryInstance = new OuterModel({});
        const originalPrimaryInstanceCopy = clone(primaryInstance, { generateNewIds: false });
        const secondaryInstanceSeparatePatches = clone(primaryInstance, { generateNewIds: false });
        const secondaryInstanceMergedPatch = clone(primaryInstance, { generateNewIds: false });

        // Add
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.set("someKey", "a");

        const patchPacket1 = (await patchesForNextActionPromise);
        expect(patchPacket1.patches.length).toBe(1);
        expect(patchPacket1.patches[0].op).toBe("add");
        expect(patchPacket1.inversePatches.length).toBe(1);
        expect(patchPacket1.inversePatches[0].op).toBe("remove");

        // Replace
        patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.set("someKey", "b");

        const patchPacket2 = (await patchesForNextActionPromise);
        expect(patchPacket2.patches.length).toBe(1);
        expect(patchPacket2.patches[0].op).toBe("replace");
        expect(patchPacket2.inversePatches.length).toBe(1);
        expect(patchPacket2.inversePatches[0].op).toBe("replace");

        // Merge
        const mergedPatchPacket = tryMergePatchesWithSamePath(
            patchPacket1.patches[0], patchPacket1.inversePatches[0],
            patchPacket2.patches[0], patchPacket2.inversePatches[0]
        );
        expect(mergedPatchPacket.patch.op).toBe("add");
        expect(mergedPatchPacket.inversePatch.op).toBe("remove");

        // Patch forward
        expect(primaryInstance).not.toStrictEqual(secondaryInstanceSeparatePatches);
        expect(primaryInstance).not.toStrictEqual(secondaryInstanceMergedPatch);

        let result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.patches[0], patchPacket1.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.patches[0], patchPacket2.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceMergedPatch, mergedPatchPacket.patch, mergedPatchPacket.inversePatch);
        expect(result).toBe(PatchCheckResult.Success);

        expect(primaryInstance).toStrictEqual(secondaryInstanceSeparatePatches);
        expect(primaryInstance).toStrictEqual(secondaryInstanceMergedPatch);

        // Patch inverse
        expect(originalPrimaryInstanceCopy).not.toStrictEqual(secondaryInstanceSeparatePatches);
        expect(originalPrimaryInstanceCopy).not.toStrictEqual(secondaryInstanceMergedPatch);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.inversePatches[0], patchPacket2.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.inversePatches[0], patchPacket1.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceMergedPatch, mergedPatchPacket.inversePatch, mergedPatchPacket.patch);
        expect(result).toBe(PatchCheckResult.Success);

        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceSeparatePatches);
        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceMergedPatch);
    });

    test("objectMap: (add -> remove) == null", async () => {
        const primaryInstance = new OuterModel({});
        const originalPrimaryInstanceCopy = clone(primaryInstance, { generateNewIds: false });
        const secondaryInstanceSeparatePatches = clone(primaryInstance, { generateNewIds: false });

        // Add
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.set("someKey", "a");

        const patchPacket1 = (await patchesForNextActionPromise);
        expect(patchPacket1.patches.length).toBe(1);
        expect(patchPacket1.patches[0].op).toBe("add");
        expect(patchPacket1.inversePatches.length).toBe(1);
        expect(patchPacket1.inversePatches[0].op).toBe("remove");

        // Remove
        patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.delete("someKey");

        const patchPacket2 = (await patchesForNextActionPromise);
        expect(patchPacket2.patches.length).toBe(1);
        expect(patchPacket2.patches[0].op).toBe("remove");
        expect(patchPacket2.inversePatches.length).toBe(1);
        expect(patchPacket2.inversePatches[0].op).toBe("add");

        // Merge
        const mergedPatchPacket = tryMergePatchesWithSamePath(
            patchPacket1.patches[0], patchPacket1.inversePatches[0],
            patchPacket2.patches[0], patchPacket2.inversePatches[0]
        );
        expect(mergedPatchPacket.patch).toBeNull();
        expect(mergedPatchPacket.inversePatch).toBeNull();

        // Patch forward
        expect(primaryInstance).toStrictEqual(secondaryInstanceSeparatePatches);

        let result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.patches[0], patchPacket1.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(primaryInstance).not.toStrictEqual(secondaryInstanceSeparatePatches);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.patches[0], patchPacket2.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(primaryInstance).toStrictEqual(secondaryInstanceSeparatePatches);

        // Patch inverse
        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceSeparatePatches);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.inversePatches[0], patchPacket2.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(originalPrimaryInstanceCopy).not.toStrictEqual(secondaryInstanceSeparatePatches);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.inversePatches[0], patchPacket1.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceSeparatePatches);
    });

    test("objectMap: (replace -> replace) == replace", async () => {
        const primaryInstance = new OuterModel({});
        primaryInstance.stringMap.set("someKey", "-");
        const originalPrimaryInstanceCopy = clone(primaryInstance, { generateNewIds: false });
        const secondaryInstanceSeparatePatches = clone(primaryInstance, { generateNewIds: false });
        const secondaryInstanceMergedPatch = clone(primaryInstance, { generateNewIds: false });

        // Replace
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.set("someKey", "a");

        const patchPacket1 = (await patchesForNextActionPromise);
        expect(patchPacket1.patches.length).toBe(1);
        expect(patchPacket1.patches[0].op).toBe("replace");
        expect(patchPacket1.inversePatches.length).toBe(1);
        expect(patchPacket1.inversePatches[0].op).toBe("replace");

        // Replace
        patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.set("someKey", "b");

        const patchPacket2 = (await patchesForNextActionPromise);
        expect(patchPacket2.patches.length).toBe(1);
        expect(patchPacket2.patches[0].op).toBe("replace");
        expect(patchPacket2.inversePatches.length).toBe(1);
        expect(patchPacket2.inversePatches[0].op).toBe("replace");

        // Merge
        const mergedPatchPacket = tryMergePatchesWithSamePath(
            patchPacket1.patches[0], patchPacket1.inversePatches[0],
            patchPacket2.patches[0], patchPacket2.inversePatches[0]
        );
        expect(mergedPatchPacket.patch.op).toBe("replace");
        expect(mergedPatchPacket.inversePatch.op).toBe("replace");

        // Patch forward
        expect(primaryInstance).not.toStrictEqual(secondaryInstanceSeparatePatches);
        expect(primaryInstance).not.toStrictEqual(secondaryInstanceMergedPatch);

        let result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.patches[0], patchPacket1.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.patches[0], patchPacket2.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceMergedPatch, mergedPatchPacket.patch, mergedPatchPacket.inversePatch);
        expect(result).toBe(PatchCheckResult.Success);

        expect(primaryInstance).toStrictEqual(secondaryInstanceSeparatePatches);
        expect(primaryInstance).toStrictEqual(secondaryInstanceMergedPatch);

        // Patch inverse
        expect(originalPrimaryInstanceCopy).not.toStrictEqual(secondaryInstanceSeparatePatches);
        expect(originalPrimaryInstanceCopy).not.toStrictEqual(secondaryInstanceMergedPatch);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.inversePatches[0], patchPacket2.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.inversePatches[0], patchPacket1.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceMergedPatch, mergedPatchPacket.inversePatch, mergedPatchPacket.patch);
        expect(result).toBe(PatchCheckResult.Success);

        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceSeparatePatches);
        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceMergedPatch);
    });

    test("objectMap: (replace -> replace) different paths rejection", async () => {
        const primaryInstance = new OuterModel({});
        primaryInstance.stringMap.set("someKey1", "-");
        primaryInstance.stringMap.set("someKey2", "-");

        // Replace
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.set("someKey1", "a");

        const patchPacket1 = (await patchesForNextActionPromise);
        expect(patchPacket1.patches.length).toBe(1);
        expect(patchPacket1.patches[0].op).toBe("replace");
        expect(patchPacket1.inversePatches.length).toBe(1);
        expect(patchPacket1.inversePatches[0].op).toBe("replace");

        // Replace
        patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.set("someKey2", "b");

        const patchPacket2 = (await patchesForNextActionPromise);
        expect(patchPacket2.patches.length).toBe(1);
        expect(patchPacket2.patches[0].op).toBe("replace");
        expect(patchPacket2.inversePatches.length).toBe(1);
        expect(patchPacket2.inversePatches[0].op).toBe("replace");

        // Merge
        const mergedPatchPacket = tryMergePatchesWithSamePath(
            patchPacket1.patches[0], patchPacket1.inversePatches[0],
            patchPacket2.patches[0], patchPacket2.inversePatches[0]
        );
        expect(mergedPatchPacket).toBeNull();
    });

    test("objectMap: (replace -> remove) == remove", async () => {
        const primaryInstance = new OuterModel({});
        primaryInstance.stringMap.set("someKey", "-");
        const originalPrimaryInstanceCopy = clone(primaryInstance, { generateNewIds: false });
        const secondaryInstanceSeparatePatches = clone(primaryInstance, { generateNewIds: false });
        const secondaryInstanceMergedPatch = clone(primaryInstance, { generateNewIds: false });

        // Replace
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.set("someKey", "a");

        const patchPacket1 = (await patchesForNextActionPromise);
        expect(patchPacket1.patches.length).toBe(1);
        expect(patchPacket1.patches[0].op).toBe("replace");
        expect(patchPacket1.inversePatches.length).toBe(1);
        expect(patchPacket1.inversePatches[0].op).toBe("replace");

        // Remove
        patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.delete("someKey");

        const patchPacket2 = (await patchesForNextActionPromise);
        expect(patchPacket2.patches.length).toBe(1);
        expect(patchPacket2.patches[0].op).toBe("remove");
        expect(patchPacket2.inversePatches.length).toBe(1);
        expect(patchPacket2.inversePatches[0].op).toBe("add");

        // Merge
        const mergedPatchPacket = tryMergePatchesWithSamePath(
            patchPacket1.patches[0], patchPacket1.inversePatches[0],
            patchPacket2.patches[0], patchPacket2.inversePatches[0]
        );
        expect(mergedPatchPacket.patch.op).toBe("remove");
        expect(mergedPatchPacket.inversePatch.op).toBe("add");

        // Patch forward
        expect(primaryInstance).not.toStrictEqual(secondaryInstanceSeparatePatches);
        expect(primaryInstance).not.toStrictEqual(secondaryInstanceMergedPatch);

        let result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.patches[0], patchPacket1.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.patches[0], patchPacket2.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceMergedPatch, mergedPatchPacket.patch, mergedPatchPacket.inversePatch);
        expect(result).toBe(PatchCheckResult.Success);

        expect(primaryInstance).toStrictEqual(secondaryInstanceSeparatePatches);
        expect(primaryInstance).toStrictEqual(secondaryInstanceMergedPatch);

        // Patch inverse
        expect(originalPrimaryInstanceCopy).not.toStrictEqual(secondaryInstanceSeparatePatches);
        expect(originalPrimaryInstanceCopy).not.toStrictEqual(secondaryInstanceMergedPatch);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.inversePatches[0], patchPacket2.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.inversePatches[0], patchPacket1.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceMergedPatch, mergedPatchPacket.inversePatch, mergedPatchPacket.patch);
        expect(result).toBe(PatchCheckResult.Success);

        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceSeparatePatches);
        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceMergedPatch);
    });

    test("objectMap: (remove -> add) == replace", async () => {
        const primaryInstance = new OuterModel({});
        primaryInstance.stringMap.set("someKey", "-");
        const originalPrimaryInstanceCopy = clone(primaryInstance, { generateNewIds: false });
        const secondaryInstanceSeparatePatches = clone(primaryInstance, { generateNewIds: false });
        const secondaryInstanceMergedPatch = clone(primaryInstance, { generateNewIds: false });

        // Remove
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.delete("someKey");

        const patchPacket1 = (await patchesForNextActionPromise);
        expect(patchPacket1.patches.length).toBe(1);
        expect(patchPacket1.patches[0].op).toBe("remove");
        expect(patchPacket1.inversePatches.length).toBe(1);
        expect(patchPacket1.inversePatches[0].op).toBe("add");

        // Add
        patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.stringMap.set("someKey", "b");

        const patchPacket2 = (await patchesForNextActionPromise);
        expect(patchPacket2.patches.length).toBe(1);
        expect(patchPacket2.patches[0].op).toBe("add");
        expect(patchPacket2.inversePatches.length).toBe(1);
        expect(patchPacket2.inversePatches[0].op).toBe("remove");

        // Merge
        const mergedPatchPacket = tryMergePatchesWithSamePath(
            patchPacket1.patches[0], patchPacket1.inversePatches[0],
            patchPacket2.patches[0], patchPacket2.inversePatches[0]
        );
        expect(mergedPatchPacket.patch.op).toBe("replace");
        expect((mergedPatchPacket.patch as any).value).toBe("b");
        expect(mergedPatchPacket.inversePatch.op).toBe("replace");
        expect((mergedPatchPacket.inversePatch as any).value).toBe("-");

        // Patch forward
        expect(primaryInstance).not.toStrictEqual(secondaryInstanceSeparatePatches);
        expect(primaryInstance).not.toStrictEqual(secondaryInstanceMergedPatch);

        let result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.patches[0], patchPacket1.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.patches[0], patchPacket2.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceMergedPatch, mergedPatchPacket.patch, mergedPatchPacket.inversePatch);
        expect(result).toBe(PatchCheckResult.Success);

        expect(primaryInstance).toStrictEqual(secondaryInstanceSeparatePatches);
        expect(primaryInstance).toStrictEqual(secondaryInstanceMergedPatch);

        // Patch inverse
        expect(originalPrimaryInstanceCopy).not.toStrictEqual(secondaryInstanceSeparatePatches);
        expect(originalPrimaryInstanceCopy).not.toStrictEqual(secondaryInstanceMergedPatch);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.inversePatches[0], patchPacket2.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.inversePatches[0], patchPacket1.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceMergedPatch, mergedPatchPacket.inversePatch, mergedPatchPacket.patch);
        expect(result).toBe(PatchCheckResult.Success);

        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceSeparatePatches);
        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceMergedPatch);
    });

    test("regular value: (replace -> replace) == replace", async () => {
        const primaryInstance = new OuterModel({});
        const originalPrimaryInstanceCopy = clone(primaryInstance, { generateNewIds: false });
        const secondaryInstanceSeparatePatches = clone(primaryInstance, { generateNewIds: false });
        const secondaryInstanceMergedPatch = clone(primaryInstance, { generateNewIds: false });

        // Replace
        let patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.setSomeOuterValue(2);

        const patchPacket1 = (await patchesForNextActionPromise);
        expect(patchPacket1.patches.length).toBe(1);
        expect(patchPacket1.patches[0].op).toBe("replace");
        expect(patchPacket1.inversePatches.length).toBe(1);
        expect(patchPacket1.inversePatches[0].op).toBe("replace");

        // Replace
        patchesForNextActionPromise = onGetPatchesForNextAction(primaryInstance);
        primaryInstance.setSomeOuterValue(3);

        const patchPacket2 = (await patchesForNextActionPromise);
        expect(patchPacket2.patches.length).toBe(1);
        expect(patchPacket2.patches[0].op).toBe("replace");
        expect(patchPacket2.inversePatches.length).toBe(1);
        expect(patchPacket2.inversePatches[0].op).toBe("replace");

        // Merge
        const mergedPatchPacket = tryMergePatchesWithSamePath(
            patchPacket1.patches[0], patchPacket1.inversePatches[0],
            patchPacket2.patches[0], patchPacket2.inversePatches[0]
        );
        expect(mergedPatchPacket.patch.op).toBe("replace");
        expect(mergedPatchPacket.inversePatch.op).toBe("replace");

        // Patch forward
        expect(primaryInstance).not.toStrictEqual(secondaryInstanceSeparatePatches);
        expect(primaryInstance).not.toStrictEqual(secondaryInstanceMergedPatch);

        let result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.patches[0], patchPacket1.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.patches[0], patchPacket2.inversePatches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceMergedPatch, mergedPatchPacket.patch, mergedPatchPacket.inversePatch);
        expect(result).toBe(PatchCheckResult.Success);

        expect(primaryInstance).toStrictEqual(secondaryInstanceSeparatePatches);
        expect(primaryInstance).toStrictEqual(secondaryInstanceMergedPatch);

        // Patch inverse
        expect(originalPrimaryInstanceCopy).not.toStrictEqual(secondaryInstanceSeparatePatches);
        expect(originalPrimaryInstanceCopy).not.toStrictEqual(secondaryInstanceMergedPatch);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket2.inversePatches[0], patchPacket2.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceSeparatePatches, patchPacket1.inversePatches[0], patchPacket1.patches[0]);
        expect(result).toBe(PatchCheckResult.Success);

        result = applyPatchIfValueWasNotChanged(secondaryInstanceMergedPatch, mergedPatchPacket.inversePatch, mergedPatchPacket.patch);
        expect(result).toBe(PatchCheckResult.Success);

        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceSeparatePatches);
        expect(originalPrimaryInstanceCopy).toStrictEqual(secondaryInstanceMergedPatch);
    });
});

@model("test/ChildModel")
export class ChildModel extends Model({
}) {
}

@model("test/TestModel")
export class TestModel extends Model({
    valueA: prop<number>(1).withSetter(),
    valueB: prop<number>(2).withSetter(),
    valueC: prop<number>(3).withSetter(),
    children: prop<ChildModel[]>(() => [])
}) {
    @modelAction
    public addChild() {
        const innerModel = new ChildModel({});
        this.children.push(innerModel);
        return innerModel;
    }

    @modelAction
    public removeChild(index: number) {
        this.children.splice(index, 1);
    }
}

describe("checkAndApplyMultiplePatches", () => {
    test("applies multiple patches", async () => {
        const primaryInstance = new TestModel({});
        const secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        const patches = new Array<AugmentedPatch>();
        const inversePatches = new Array<AugmentedPatch>();
        const stopRecording = onPatchesImproved(
            primaryInstance,
            (newPatches, newInversePatches) => {
                patches.push(...newPatches);
                inversePatches.push(...newInversePatches);
            },
            null
        );

        primaryInstance.setValueA(4);
        primaryInstance.addChild();
        primaryInstance.addChild();
        primaryInstance.setValueB(5);
        primaryInstance.removeChild(0);
        primaryInstance.setValueC(6);
        primaryInstance.setValueA(7);

        stopRecording();

        expect(secondaryInstance.valueA).toEqual(1);
        expect(secondaryInstance.valueB).toEqual(2);
        expect(secondaryInstance.valueC).toEqual(3);
        expect(secondaryInstance.children.length).toEqual(0);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        checkAndApplyAllPatchesOrThrow(secondaryInstance, patches, inversePatches, "");

        expect(secondaryInstance.valueA).toEqual(7);
        expect(secondaryInstance.valueB).toEqual(5);
        expect(secondaryInstance.valueC).toEqual(6);
        expect(secondaryInstance.children.length).toEqual(1);
        expect(secondaryInstance).toStrictEqual(primaryInstance);
    });

    test("rolls back to old state if any patch fails", async () => {
        const primaryInstance = new TestModel({});
        const secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        const patches = new Array<AugmentedPatch>();
        const inversePatches = new Array<AugmentedPatch>();
        const stopRecording = onPatchesImproved(
            primaryInstance,
            (newPatches, newInversePatches) => {
                patches.push(...newPatches);
                inversePatches.push(...newInversePatches);
            },
            null
        );

        primaryInstance.setValueA(4);
        primaryInstance.addChild();
        primaryInstance.addChild();
        primaryInstance.setValueB(5);
        primaryInstance.removeChild(0);
        primaryInstance.setValueC(6);
        primaryInstance.setValueA(7);

        stopRecording();

        secondaryInstance.setValueC(99);

        expect(secondaryInstance.valueA).toEqual(1);
        expect(secondaryInstance.valueB).toEqual(2);
        expect(secondaryInstance.valueC).toEqual(99);
        expect(secondaryInstance.children.length).toEqual(0);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        const secondaryInstanceBeforePatchingSnapshot = getSnapshot(secondaryInstance);

        expect(() => checkAndApplyAllPatchesOrThrow(secondaryInstance, patches, inversePatches, "")).toThrow(TranslatedError);

        expect(secondaryInstance.valueA).toEqual(1);
        expect(secondaryInstance.valueB).toEqual(2);
        expect(secondaryInstance.valueC).toEqual(99);
        expect(secondaryInstance.children.length).toEqual(0);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);
        expect(getSnapshot(secondaryInstance)).toStrictEqual(secondaryInstanceBeforePatchingSnapshot);
    });

    test("first patch fails", async () => {
        const primaryInstance = new TestModel({});
        const secondaryInstance = clone(primaryInstance, { generateNewIds: false });
        expect(secondaryInstance).toStrictEqual(primaryInstance);

        const patches = new Array<AugmentedPatch>();
        const inversePatches = new Array<AugmentedPatch>();
        const stopRecording = onPatchesImproved(
            primaryInstance,
            (newPatches, newInversePatches) => {
                patches.push(...newPatches);
                inversePatches.push(...newInversePatches);
            },
            null
        );

        primaryInstance.setValueA(4);
        primaryInstance.addChild();
        primaryInstance.addChild();
        primaryInstance.setValueB(5);
        primaryInstance.removeChild(0);
        primaryInstance.setValueC(6);
        primaryInstance.setValueA(7);

        stopRecording();

        secondaryInstance.setValueA(99);

        expect(secondaryInstance.valueA).toEqual(99);
        expect(secondaryInstance.valueB).toEqual(2);
        expect(secondaryInstance.valueC).toEqual(3);
        expect(secondaryInstance.children.length).toEqual(0);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);

        const secondaryInstanceBeforePatchingSnapshot = getSnapshot(secondaryInstance);

        expect(() => checkAndApplyAllPatchesOrThrow(secondaryInstance, patches, inversePatches, "")).toThrow(TranslatedError);

        expect(secondaryInstance.valueA).toEqual(99);
        expect(secondaryInstance.valueB).toEqual(2);
        expect(secondaryInstance.valueC).toEqual(3);
        expect(secondaryInstance.children.length).toEqual(0);
        expect(secondaryInstance).not.toStrictEqual(primaryInstance);
        expect(getSnapshot(secondaryInstance)).toStrictEqual(secondaryInstanceBeforePatchingSnapshot);
    });
});