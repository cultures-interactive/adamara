/* eslint-disable @typescript-eslint/ban-types */
import { action } from "mobx";
import { OnPatchesDisposer, onPatches, Patch, PatchRemoveOperation, applyPatches, getSnapshot, PatchAddOperation, PatchReplaceOperation, resolvePath, Path, PathElement, WritablePath, AnyModel, deepEquals, SnapshotOutOf } from "mobx-keystone";
import { TranslatedError } from "../definitions/errors/TranslatedError";
import { objectContentsEqual } from "./generalHelpers";
import { sharedLogger } from "./logger";

const debugLogAugmentation = false;
const debugLogRealization = false;
const debugLogCheckValue = false;

interface AugmentedPathElement {
    arrayIndex: number;
    $modelId: string;
}

interface ObjectWithModelId {
    $modelId: string;
}

type PossiblyAugmentedPathElement = PathElement | AugmentedPathElement;
type AugmentedPath = ReadonlyArray<PossiblyAugmentedPathElement>;
type WritableAugmentedPath = Array<PossiblyAugmentedPathElement>;

export declare type AugmentedPatch = AugmentedPatchAddOperation<any> | AugmentedPatchRemoveOperation | AugmentedPatchReplaceOperation<any>;
export interface AugmentedPatchBaseOperation {
    path: AugmentedPath;
}
export interface AugmentedPatchAddOperation<T> extends AugmentedPatchBaseOperation {
    op: "add";
    value: T;
}
export interface AugmentedPatchRemoveOperation extends AugmentedPatchBaseOperation {
    op: "remove";
}
export interface AugmentedPatchReplaceOperation<T> extends AugmentedPatchBaseOperation {
    op: "replace";
    value: T;
}

export declare type OnAugmentedPatchesListener = (patches: AugmentedPatch[], inversePatches: AugmentedPatch[]) => void;

export function onPatchesImproved(subtreeRoot: object, listener: OnAugmentedPatchesListener, isTemporarilyDeactivated?: () => boolean): OnPatchesDisposer {
    return onPatches(subtreeRoot, (patches, inversePatches) => {
        if (isTemporarilyDeactivated && isTemporarilyDeactivated())
            return;

        // Create a copy of all patches and inverse patches before we make changes
        patches = patches.map(patch => ({ ...patch }));
        inversePatches = inversePatches.map(patch => ({ ...patch }));

        for (let i = 0; i < patches.length; i++) {
            fixPatchAndInversePatchIfNecessary(subtreeRoot, patches[i], inversePatches[i]);
        }

        if (patches.length === 1) {
            // Augment paths with model id information in places where there are array indizes
            augmentPathsInPatches(subtreeRoot, patches[0], inversePatches[0]);
        } else {
            sharedLogger.error(`onPatches() triggered with ${patches.length} patches. This is unexpected and might not work well with augmentPath(). Please tell Tobias that this happened and, if possible, how to reproduce it.`, { patches, inversePatches, subtreeRoot });
        }

        listener(patches, inversePatches);
    });
}

function fixPatchAndInversePatchIfNecessary(subtreeRoot: object, patch: Patch, inversePatch: Patch) {
    // When adding to the end of an array, mobx-keystone uses "add" for the primary operation and
    // for the inverse sets the length with "replace". That's not very compatible with a collaborative
    // process where later someone else adds to the array because we can't just pinpoint-delete the object
    // with the inverse - instead, the length will be set. So we fix that here.
    if ((patch.op === "add") && (inversePatch.op === "replace")) {
        const inversePatchCast = inversePatch as unknown as PatchRemoveOperation;
        inversePatchCast.op = "remove";
        inversePatchCast.path = patch.path;
        return;
    }

    // When removing from the end of an array, the same as described above happens the other way around.
    if ((patch.op === "replace") && (inversePatch.op === "add")) {
        const patchCast = patch as unknown as PatchRemoveOperation;
        patchCast.op = "remove";
        patchCast.path = inversePatch.path;
        return;
    }
}

/**
 * Augments array indizes in a path with $modelIds, where available.
 * WARNING: This is only guaranteed to work if this patch was the last change made on the node.
 * In other words, if the patch was just executed and NO other changes were made.
 * If this is not the case, it is better to proceed without calling augmentPathsInPatches().
 */
function augmentPathsInPatches(node: object, patch: Patch, inversePatch: Patch) {
    try {
        // If we either added a value/object the current state of "node" is fine to augment each patch in isolation.
        if ((patch.op === "add") && (inversePatch.op === "remove")) {
            augmentPath(node, patch);
            augmentPath(node, inversePatch);
            return;
        }

        // If we replaced or removed a value/object the last part of the path is already not in "node" anymore.
        // augmentPath will be fine with that for the inverse "add" operation, but we specially want
        // to augment the forward "remove" operation if the inverse "add" contains a model.
        if (((patch.op === "replace") && (inversePatch.op === "replace")) ||
            ((patch.op === "remove") && (inversePatch.op === "add"))) {
            augmentPath(node, patch, true, inversePatch.value?.$modelId);
            augmentPath(node, inversePatch);
            return;
        }

        // None of these combinations fit? That's unexpected, so we'll not augment at all.
        throw Error("augmentPathsInPatches() was called with an unexpected patch combination. Please tell Tobias that this happened and, if possible, how to reproduce it.");
    } catch (e) {
        sharedLogger.error(`augmentPathsInPatches() failed. Please tell Tobias that this happened and, if possible, how to reproduce it.`, { patch, inversePatch, node });
        throw e;
    }
}

function augmentPath(node: object, patch: Patch, skipRegularAugmentationForLastElement: boolean = false, forcedLastElementIfIndexModelId?: string) {
    if (debugLogAugmentation)
        sharedLogger.debug("Augmenting path...      " + patch.op + " @ " + JSON.stringify(patch.path));

    const { path } = patch;

    // Only augment the end of the path if the content wasn't just added - otherwise just leave it as an index.
    if (patch.op === "add")
        skipRegularAugmentationForLastElement = true;

    const resultPath: WritableAugmentedPath = [];
    let currentNode = node;
    for (let i = 0; i < path.length; i++) {
        const currentPathElement = path[i];

        const isLastPart = (i === path.length - 1);
        if (isLastPart) {
            if (skipRegularAugmentationForLastElement) {
                // If it is an index (and therefore an array), check if we have a model id that is forced
                if ((typeof currentPathElement === "number") && forcedLastElementIfIndexModelId) {
                    resultPath.push({
                        arrayIndex: currentPathElement as number,
                        $modelId: forcedLastElementIfIndexModelId
                    });
                } else {
                    resultPath.push(currentPathElement);
                }
                break;
            }
        }

        const resolveResult = resolvePath(currentNode, [currentPathElement]);
        if (!resolveResult.resolved) {
            sharedLogger.error("Cannot resolve path in augmentPathRegular()", { node, patch, i, currentNode, currentPathElement });
            throw new Error("Cannot resolve path in augmentPathRegular()");
        }

        currentNode = resolveResult.value;

        let newPathElement: PossiblyAugmentedPathElement = currentPathElement;

        // Is it an index?
        if (typeof currentPathElement === "number") {
            // Does it even have a $modelId or is it a primitive?
            const $modelId = (currentNode as any).$modelId;
            if ($modelId) {
                newPathElement = {
                    arrayIndex: currentPathElement,
                    $modelId: $modelId
                };
            }
        }

        resultPath.push(newPathElement);
    }

    patch.path = resultPath as Path;

    if (debugLogAugmentation)
        sharedLogger.debug(" > augmentation result: " + patch.op + " @ " + JSON.stringify(patch.path));
}

/**
 * Realizes an AugmentedPath into a normal path with indizes that can be used
 * in e.g. applyPatches or resolvePath. The realized path only applies to the
 * current state of node, so if anything along the arrays in the path change
 * on node, the realized path might not be valid anymore and you should call
 * this function again.
 */
export function realizePath(node: object, path: AugmentedPath): Path {
    if (debugLogRealization)
        sharedLogger.debug("Realizing path...     " + JSON.stringify(path));

    const resultPath: WritablePath = [];
    let currentNode = node;
    for (let i = 0; i < path.length; i++) {
        const currentPathElement = path[i];

        if (typeof currentPathElement === "object") {
            // If this is an augmented path element, try to resolve it.
            const augmentedCurrentPathElement = currentPathElement as AugmentedPathElement;
            const currentNodeArray = currentNode as ObjectWithModelId[];

            const expectedIndex = augmentedCurrentPathElement.arrayIndex;
            const expectedModelId = augmentedCurrentPathElement.$modelId;

            // Is the index still pointing at the right element?
            if ((expectedIndex < currentNodeArray.length) && currentNodeArray[expectedIndex]?.$modelId === expectedModelId) {
                // Index is still correct, so we just use it.
                resultPath.push(augmentedCurrentPathElement.arrayIndex);
                currentNode = currentNodeArray[augmentedCurrentPathElement.arrayIndex];
            } else {
                // Either the index doesn't exist anymore or it points to an object with another $modelId.
                // We'll search for the element now.
                const newIndex = currentNodeArray.findIndex(value => value.$modelId === expectedModelId);
                if (newIndex === -1) {
                    if (debugLogRealization)
                        sharedLogger.error("Cannot resolve path in realizePath() because the $modelId wasn't found", { i, currentNode, currentPathElement, node, path });

                    throw new Error("Cannot realize path: a model cannot be found anymore");
                } else {
                    resultPath.push(newIndex);
                    currentNode = currentNodeArray[newIndex];
                }
            }
        } else {
            // If this is a normal path element, just push it and continue going down the path.
            resultPath.push(currentPathElement);

            // If this is the last part we don't have to continue going down.
            // (In the case of an "add" operation the element down doesn't even exist yet.)
            const isLastPart = (i === path.length - 1);
            if (!isLastPart) {
                const resolveResult = resolvePath(currentNode, [currentPathElement]);
                if (!resolveResult.resolved) {
                    if (debugLogRealization)
                        sharedLogger.error("Cannot resolve path in realizePath() because a resolvePath() call failed", { i, currentNode, currentPathElement, node, path });

                    throw new Error("Cannot realize path: resolvePath() call failed");
                }

                currentNode = resolveResult.value;
            }
        }
    }

    if (debugLogRealization)
        sharedLogger.debug("> realization result: " + JSON.stringify(resultPath));

    return resultPath;
}

/**
 * Creates a patch, realizing all parts of the path that are augmented. (Note that this does NOT create deep copy of patch.value.)
 * @param node The node to apply the patch on later.
 * @param patch The patch with a possibly augmented path.
 * @returns A shallow copy of the patch with a realized path that can be used in applyPatches().
 */
function getPatchWithRealizedPath<T extends AugmentedPatch, V extends Patch>(node: object, patch: T): V {
    return {
        ...patch,
        path: realizePath(node, patch.path)
    } as unknown as V;
}

export function applyPatchImproved(node: object, patch: AugmentedPatch) {
    const realizedPatch = getPatchWithRealizedPath(node, patch);
    applyPatches(node, [realizedPatch]);
}

export const applyPatchesImproved = action((node: object, patches: ReadonlyArray<AugmentedPatch> | ReadonlyArray<ReadonlyArray<AugmentedPatch>>, reverse?: boolean) => {
    if (reverse) {
        for (let i = patches.length - 1; i >= 0; i--) {
            const patchOrArray = patches[i];
            if (Array.isArray(patchOrArray)) {
                for (let j = patchOrArray.length - 1; j >= 0; j--) {
                    applyPatchImproved(node, patchOrArray[j] as Patch);
                }
            } else {
                applyPatchImproved(node, patchOrArray as Patch);
            }
        }
    } else {
        for (const patchOrArray of patches) {
            if (Array.isArray(patchOrArray)) {
                for (const patch of patchOrArray) {
                    applyPatchImproved(node, patch as Patch);
                }
            } else {
                applyPatchImproved(node, patchOrArray as Patch);
            }
        }
    }
});

export function resolvePathImproved<T = any>(pathRootObject: object, path: AugmentedPath): {
    resolved: true;
    value: T;
} | {
    resolved: false;
    value?: undefined;
} {
    let realizedPath: Path;
    try {
        realizedPath = realizePath(pathRootObject, path);
    } catch (e) {
        if (debugLogRealization)
            sharedLogger.debug("resolvePathImproved failed", e);

        return {
            resolved: false
        };
    }

    return resolvePath<T>(pathRootObject, realizedPath);
}

export function applyPatchIfValueWasNotChanged(node: object, patch: AugmentedPatch, inversePatch: AugmentedPatch): PatchCheckResult {
    const result = checkValue(node, patch, inversePatch);
    if (result !== PatchCheckResult.Success)
        return result;

    applyPatchImproved(node, patch);
    return PatchCheckResult.Success;
}

function checkValue(node: object, patch: AugmentedPatch, inversePatch: AugmentedPatch): PatchCheckResult {
    if (debugLogCheckValue) {
        sharedLogger.debug("-----------------------------");
        sharedLogger.debug({ patch, inversePatch });
    }

    if ((patch.op === "add") && (inversePatch.op === "remove")) {
        const lastPathElement = patch.path[patch.path.length - 1] as AugmentedPathElement;
        const isArray = typeof lastPathElement === "number";
        if (isArray) {
            // If we are "add"ing stuff to arrays (as opposed to objectMaps), that is always
            // fine as long as the path until the second - to - last part resolves.
            const pathResolution = resolvePathImproved(node, patch.path.slice(0, patch.path.length - 1));
            return pathResolution.resolved
                ? PatchCheckResult.Success
                : PatchCheckResult.ErrorValueWasChanged;
        }
    } else if ((patch.op === "replace") && (inversePatch.op === "replace")) {
        // Are both paths the same?
        const stringifiedReplacePatchPath1 = JSON.stringify(patch.path);
        const stringifiedReplacePatchPath2 = JSON.stringify(inversePatch.path);
        if (stringifiedReplacePatchPath1 !== stringifiedReplacePatchPath2) {
            // Mismatch - maybe an object was replaced?
            // Are the relevant parts and the array indizes of both paths the same, and the object ids of replacement match?
            const stringifiedReplacePatchPath1ExceptLast = JSON.stringify(patch.path.slice(0, patch.path.length - 1));
            const stringifiedReplacePatchPath2ExceptLast = JSON.stringify(inversePatch.path.slice(0, inversePatch.path.length - 1));
            const lastElementPath1 = patch.path[patch.path.length - 1] as AugmentedPathElement;
            const lastElementPath2 = inversePatch.path[inversePatch.path.length - 1] as AugmentedPathElement;
            console.log({
                stringifiedReplacePatchPath1ExceptLast,
                stringifiedReplacePatchPath2ExceptLast,
                lastElementPath1,
                lastElementPath2
            });
            if ((stringifiedReplacePatchPath1ExceptLast !== stringifiedReplacePatchPath2ExceptLast) ||
                (lastElementPath1.arrayIndex !== lastElementPath2.arrayIndex) ||
                (lastElementPath1.$modelId !== inversePatch.value.$modelId) ||
                (lastElementPath2.$modelId !== patch.value.$modelId)) {
                throw new Error(`Replace path mismatch (${stringifiedReplacePatchPath1} vs ${stringifiedReplacePatchPath2}). Please report this to Tobias.`);
            }
        }

    } else if ((patch.op === "remove") && (inversePatch.op === "add")) {
        // Are the relevant parts of both paths the same?
        const stringifiedRemovePatchPath = JSON.stringify(patch.path.slice(0, patch.path.length - 1));
        const stringifiedAddPatchPath = JSON.stringify(inversePatch.path.slice(0, inversePatch.path.length - 1));
        if (stringifiedRemovePatchPath !== stringifiedAddPatchPath)
            throw new Error(`Remove/add path mismatch (relevant parts ${stringifiedRemovePatchPath} vs ${stringifiedAddPatchPath}). Please report this to Tobias.`);
    } else {
        throw new Error(`forward '${patch.op}' + inverse '${inversePatch.op}' is unexpected. Please report this to Tobias.`);
    }

    const pathResolution = resolvePathImproved(node, patch.path);
    if (debugLogCheckValue) {
        sharedLogger.debug({ pathResolution });
    }

    // Make sure the path resolves.
    if (!pathResolution.resolved)
        return PatchCheckResult.ErrorValueWasChanged;

    // Make sure the expected value is still set.
    if (!valuesEqual(pathResolution, inversePatch))
        return PatchCheckResult.ErrorValueWasChanged;

    // This is an inverse "add" or "replace" operation
    return PatchCheckResult.Success;
}

function valuesEqual<T>(pathResolution: { resolved: true; value: object; }, patch: PatchAddOperation<T> | PatchReplaceOperation<T> | PatchRemoveOperation | AugmentedPatchAddOperation<T> | AugmentedPatchReplaceOperation<T> | AugmentedPatchRemoveOperation) {
    if (patch.op === "remove") {
        return pathResolution.value === undefined;
    }

    if (typeof pathResolution.value === "object") {
        if (!objectContentsEqual<any>(getSnapshot(pathResolution.value), patch.value))
            return false;
    } else {
        if (pathResolution.value !== patch.value)
            return false;
    }

    return true;
}

export enum PatchCheckResult {
    Success,
    ErrorValueWasChanged
}

interface PatchPacket {
    patch: AugmentedPatch;
    inversePatch: AugmentedPatch;
}

/**
 * Merges patch pairs with same path:
 * - Regular value changes
 * - objectMap changes
 */
export function tryMergePatchesWithSamePath(previousPatch: AugmentedPatch, previousInversePatch: AugmentedPatch, newPatch: AugmentedPatch, newInversePatch: AugmentedPatch): PatchPacket {
    const pathMatches = objectContentsEqual(newPatch.path, newInversePatch.path) &&
        objectContentsEqual(newPatch.path, previousPatch.path) &&
        objectContentsEqual(newPatch.path, previousInversePatch.path);
    const previousIsAdd = (previousPatch.op === "add") && (previousInversePatch.op === "remove");
    const previousIsReplace = (previousPatch.op === "replace") && (previousInversePatch.op === "replace");
    const previousIsRemove = (previousPatch.op === "remove") && (previousInversePatch.op === "add");
    const currentIsAdd = (newPatch.op === "add") && (newInversePatch.op === "remove");
    const currentIsReplace = (newPatch.op === "replace") && (newInversePatch.op === "replace");
    const currentIsRemove = (newPatch.op === "remove") && (newInversePatch.op === "add");

    if (!pathMatches)
        return null;

    // Combinations that make no sense:
    // - add -> add (cannot add something that is already there)
    // - replace -> add (cannot add something that is already there)
    // - remove -> replace (cannot replace something that is already removed)
    // - remove -> remove (cannot remove something that is already removed)

    // "add -> replace" becomes an add operation (set inverse op to previous inverse op)
    if (previousIsAdd && currentIsReplace) {
        return {
            patch: { ...newPatch, op: "add" } as AugmentedPatchAddOperation<any>,
            inversePatch: previousInversePatch
        };
    }

    // "add -> remove" becomes a null operation
    if (previousIsAdd && currentIsRemove) {
        return {
            patch: null,
            inversePatch: null
        };
    }

    // "replace -> replace" stays as a replace operation (set inverse value to previous inverse value)
    if (previousIsReplace && currentIsReplace) {
        return {
            patch: newPatch,
            inversePatch: previousInversePatch
        };
    }

    // "replace -> remove" stays a remove operation (set inverse value to previous inverse value)
    if (previousIsReplace && currentIsRemove) {
        return {
            patch: newPatch,
            inversePatch: { ...previousInversePatch, op: "add" } as AugmentedPatchAddOperation<any>
        };
    }

    // "remove -> add" becomes a replace operation (set inverse value to previous inverse value)
    if (previousIsRemove && currentIsAdd) {
        return {
            patch: { ...newPatch, op: "replace" } as AugmentedPatchReplaceOperation<any>,
            inversePatch: { ...previousInversePatch, op: "replace" } as AugmentedPatchReplaceOperation<any>
        };
    }

    return null;
}

/**
 * Generates a snapshot from a model instance. Uses a cache if no changes
 * were made to the model instance in the meantime.
 */
export class CachingSnapshotGenerator<T extends AnyModel> {
    private dirtyTracker: DirtyTracker;
    private cachedSnapshot: SnapshotOutOf<T>;

    public constructor(
        private instance: T,
    ) {
        this.dirtyTracker = new DirtyTracker(instance, true);
    }

    public dispose() {
        this.dirtyTracker.dispose();
    }

    public get snapshot() {
        if (this.dirtyTracker.isDirty) {
            this.dirtyTracker.markNotDirty();
            //console.log("Regenerated snapshot");
            this.cachedSnapshot = getSnapshot(this.instance);
        } else {
            //console.log("Using cached snapshot");
        }

        return this.cachedSnapshot;
    }
}

/**
 * Tracks whether any changes have been made to a model instance.
 */
export class DirtyTracker {
    private patchListenerDisposer: OnPatchesDisposer;
    private _isDirty: boolean;

    public constructor(instance: AnyModel, startDirty: boolean) {
        this.patchListenerDisposer = onPatches(instance, () => { this._isDirty = true; });
        this._isDirty = startDirty;
    }

    public dispose() {
        this.ensureNotDisposed();

        this.patchListenerDisposer();
        this.patchListenerDisposer = null;
    }

    private ensureNotDisposed() {
        if (!this.patchListenerDisposer)
            throw Error("DirtyTracker was already disposed");
    }

    public get isDirty() {
        this.ensureNotDisposed();
        return this._isDirty;
    }

    public markNotDirty() {
        this._isDirty = false;
    }
}

/**
 * Calls executer, and then returns whether any changes were made to checkTarget.
 * 
 * @returns true if any changes were made, else false
 */
export function makeChanges(checkTarget: any, executer: () => void) {
    const snapshotBefore = getSnapshot(checkTarget);
    executer();
    const snapshotAfter = getSnapshot(checkTarget);

    return !deepEquals(snapshotBefore, snapshotAfter);
}

/**
 * Applies multiple patches, checking their old values via inversePatches before applying them. If any of them fails,
 * an exception is thrown and targetNode is rolled back to its old state.
 */
export function checkAndApplyAllPatchesOrThrow(targetNode: any, patches: AugmentedPatch[], inversePatches: AugmentedPatch[], conflictTranslatedErrorKey: string) {
    const executedPatchesInverse = new Array<AugmentedPatch>();

    try {
        for (let i = 0; i < patches.length; i++) {
            checkAndApplyPatchOrThrow(targetNode, patches[i], inversePatches[i], conflictTranslatedErrorKey);
            executedPatchesInverse.push(inversePatches[i]);
        }
    } catch (e) {
        // Roll already successfully executed patches back to put the targetNode back into it's original state
        applyPatchesImproved(targetNode, executedPatchesInverse, true);

        throw e;
    }
}

export function checkAndApplyPatchOrThrow(targetNode: any, patch: AugmentedPatch, inversePatch: AugmentedPatch, conflictTranslatedErrorKey: string) {
    const result = applyPatchIfValueWasNotChanged(targetNode, patch, inversePatch);
    switch (result) {
        case PatchCheckResult.ErrorValueWasChanged:
            throw new TranslatedError(conflictTranslatedErrorKey);

        case PatchCheckResult.Success:
            break;

        default:
            throw new Error("Not implemented: " + result);
    }
}

/**
 * Applies multiple patches, checking their old values via inversePatches before applying them, andd returns which patches were
 * successful. All patches will be executed in order, even if some of them fail.
 */
export function checkAndApplyAsManyPatchesAsPossible(targetNode: any, patches: AugmentedPatch[], inversePatches: AugmentedPatch[]) {
    const results = new Array<PatchCheckResult>();

    for (let i = 0; i < patches.length; i++) {
        const result = applyPatchIfValueWasNotChanged(targetNode, patches[i], inversePatches[i]);
        results.push(result);
    }

    return results;
}