import { action, makeObservable, observable, runInAction } from "mobx";
import { AugmentedPatch, tryMergePatchesWithSamePath } from "../../../shared/helper/mobXHelpers";

export abstract class UndoableOperation {
    public mayTryMerge = true;
    public isBusy: boolean;
    private _executionPromise: Promise<void>;

    protected constructor(
        public readonly name: string
    ) {
        makeObservable(this, {
            mayTryMerge: observable,
            isBusy: observable
        });
    }

    public abstract execute(isRedo: boolean): Promise<void>;
    public abstract reverse(): Promise<void>;

    public merge(previousOperation: UndoableOperation) {
        return false;
    }

    public get nameTranslationKey() {
        return "undoOperation." + this.name;
    }

    public get executionPromise() {
        return this._executionPromise;
    }

    public setExecutionPromise(executionPromise: Promise<void>) {
        this._executionPromise = executionPromise;
        this.isBusy = true;
        this._executionPromise
            .catch(() => { }) // eat the errors, we are taking care of them elsewhere
            .finally(action(() => {
                this.isBusy = false;
            }));
    }
}

interface GenericChangeGroup<E, ExtraData> {
    currentChangeGroup: E;
    currentGroupId: number;
    queuedSideEffects: UndoableOperationGroupSideEffect[];
    extraData: ExtraData;
}

export function createChangeGroupStack<E, ExtraData>(noneGroup: E,): Array<GenericChangeGroup<E, ExtraData>> {
    return [{
        currentChangeGroup: noneGroup,
        currentGroupId: null,
        queuedSideEffects: null,
        extraData: null
    }];
}

let nextGroupId = 1;

/**
 * Creates a `groupUndoableChanges` function with the following description:
 * 
 * This method groups all changes made inside `executer` and merges them into one undo/redo entry, and labels
 * it appropriately (according to the selected `group`) and executes side effects if necessary.
 * 
 * Generally, outside of a `groupUndoableChanges` executer, every change is made with `*ChangeGroup.None`
 * and automatically gets merged with the previous change if it is also `*ChangeGroup.None`, unless merging is broken
 * by
 * - a focus change (e.g. a switch to a different text field)
 * - a click (e.g. on a button or dropdown) - here, the onClick handler of the button is executed first, and then merging
 *   is broken for the changes made)
 * 
 * This hopefully leads to text field changes being merged automatically as expected, and all other changed not to be merged.
 * If this ever leads to either a) unwanted merges or b) desired merges not happening, please inform Tobias Wehrum.
 * 
 * The contents of separate calls `groupUndoableChanges` will never be merged with each other.
 * 
 * @param changeGroupStack The stack of change groups
 * @param noneGroup *ChangeGroup.None
 * @returns a groupUndoableChanges function with those parameters:
 * - group: A group denoting the purpose of the grouped changes in executer
 * - executer: The callback that contains all changes that should be grouped
 * - sideEffects: Side effects to be executed after the first patch (initial run) or after all patches (undo/redo)
 */
export function createGroupUndoableChangesFunction<E, ExtraData>(
    changeGroupStack: GenericChangeGroup<E, ExtraData>[],
    noneGroup: E,
    initializeExtraData: () => ExtraData = () => null,
    executeFinally?: () => void
) {
    return (
        group: E,
        executer: () => void,
        sideEffects?: UndoableOperationGroupSideEffect[]
    ) => {
        if (group === noneGroup)
            throw new Error("Don't call groupUndoableChanges with 'None' group.");

        changeGroupStack.push({
            currentChangeGroup: group,
            currentGroupId: nextGroupId++,
            queuedSideEffects: sideEffects,
            extraData: initializeExtraData()
        });

        try {
            runInAction(() => {
                executer();
            });
        } finally {
            try {
                executeFinally?.();
            } finally {
                changeGroupStack.pop();
            }
        }
    };
}

export interface UndoableOperationGroupSideEffect {
    afterExecute(isRedo: boolean): Promise<void>;
    afterReverse(): Promise<void>;
}

interface GroupedPatchOp<E> {
    groupId: number;
    group: E;
    sideEffects: UndoableOperationGroupSideEffect[];
    patches: AugmentedPatch[];
    inversePatches: AugmentedPatch[];
}

export function mergeGroupedPatchOp<T extends GroupedPatchOp<E>, E>(thisOperation: T, previousOperation: T, autoMergableGroups: Array<E>, noneGroup: E) {
    // Only may group if same group
    if (thisOperation.groupId !== previousOperation.groupId)
        return false;

    if (thisOperation.group === noneGroup) {
        if ((thisOperation.sideEffects?.length > 0) || (previousOperation.sideEffects?.length > 0)) {
            throw new Error("'None' groups can never have side effects.");
        }

        // If the previous patch is empty (due to a collision of add -> remove earlier), just let it be removed doing anything
        if ((previousOperation.patches.length === 0) && (previousOperation.inversePatches.length === 0))
            return true;

        // Changed properties? Possibly merge.
        // There's lot of things I'm expecting to be implicitly always true if this is not another group.
        const onlyOnePatch = (thisOperation.patches.length === 1) && (thisOperation.inversePatches.length === 1) &&
            (previousOperation.patches.length === 1) && (previousOperation.inversePatches.length === 1);

        if (onlyOnePatch) {
            const mergeResult = tryMergePatchesWithSamePath(
                previousOperation.patches[0], previousOperation.inversePatches[0],
                thisOperation.patches[0], thisOperation.inversePatches[0]
            );

            if (mergeResult) {
                if ((mergeResult.patch === null) && (mergeResult.inversePatch === null)) {
                    thisOperation.patches = [];
                    thisOperation.inversePatches = [];
                } else {
                    thisOperation.patches = [mergeResult.patch];
                    thisOperation.inversePatches = [mergeResult.inversePatch];
                }
                return true;
            }

            throw new Error("tryMergePatchesWithSamePath: Paths didn't match.");
        }

        console.error("Would've expected to be able to merge two grouped patch operations with 'None' group, but it failed. Please tell Tobias how to reproduce this.", {
            onlyOnePatch,
            this: this,
            previousOperation
        });
        throw new Error("Would've expected to be able to merge two grouped patch operations with 'None' group, but it failed. Please tell Tobias how to reproduce this.");
    } else {
        if (autoMergableGroups.indexOf(thisOperation.group) === -1) {
            console.error(`Unexpected group merging: ${thisOperation.group}. This might be fine, but it definitely is unexpected. Please tell Tobias how to reproduce this.`, {
                this: this,
                previousOperation
            });
            throw new Error(`Unexpected group merging: ${thisOperation.group}. This might be fine, but it definitely is unexpected. Please tell Tobias how to reproduce this.`);
        }

        if (thisOperation.sideEffects?.length > 0) {
            console.error("Only the first operation in a merge group should have side effects.", {
                this: this,
                previousOperation
            });
            throw new Error("Only the first operation in a merge group should have side effects.");
        }

        thisOperation.patches.splice(0, 0, ...previousOperation.patches);
        thisOperation.inversePatches.splice(0, 0, ...previousOperation.inversePatches);
        thisOperation.sideEffects = previousOperation.sideEffects;
        return true;
    }
}

interface SinglePatchOp {
    patch: AugmentedPatch;
    inversePatch: AugmentedPatch;
}

export function mergeSinglePatchOp<T extends SinglePatchOp>(thisOperation: T, previousOperation: T) {
    const mergeResult = tryMergePatchesWithSamePath(
        previousOperation.patch, previousOperation.inversePatch,
        thisOperation.patch, thisOperation.inversePatch
    );

    if (!mergeResult || !mergeResult.patch || !mergeResult.inversePatch)
        return false;

    thisOperation.patch = mergeResult.patch;
    thisOperation.inversePatch = mergeResult.inversePatch;
    return true;
}