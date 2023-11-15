import { AugmentedPatch } from "../../../../shared/helper/mobXHelpers";
import { editorClient } from "../../../communication/EditorClient";
import { charEditorStore } from "../../CharacterEditorStore";
import { sharedStore } from "../../SharedStore";
import { translationStore } from "../../TranslationStore";
import { createChangeGroupStack, createGroupUndoableChangesFunction, mergeGroupedPatchOp, UndoableOperation, UndoableOperationGroupSideEffect } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { selectCharacterOrThrow } from "./CharacterEditorSelectCharacterOp";

export enum CharacterEditorChangeGroup {
    None,

    /**
     * UnspecificGroupedChanges should only be used for when several changes are made to a
     * which should be merged, but should have the same unspecific label as None.
     */
    UnspecificGroupedChanges
}

const autoMergableGroups = [
    CharacterEditorChangeGroup.UnspecificGroupedChanges
];

interface ExecuteAsGroupExtraData {
    patches: AugmentedPatch[];
    inversePatches: AugmentedPatch[];
    characterConfigurationId: number;
}

const changeGroupStack = createChangeGroupStack<CharacterEditorChangeGroup, ExecuteAsGroupExtraData>(CharacterEditorChangeGroup.None);

/**
 * This method groups all changes made inside `executer` and merges them into one undo/redo entry, and labels
 * it appropriately (according to the selected `group`) and executes side effects if necessary.
 * 
 * @see {@link createGroupUndoableChangesFunction} for more information.
 *
 * @param group A group denoting the purpose of the grouped changes in executer
 * @param executer The callback that contains all changes that should be grouped
 * @param sideEffects Side effects to be executed after the first patch (initial run) or after all patches (undo/redo)
 */
export const groupUndoableCharacterEditorChanges = createGroupUndoableChangesFunction<CharacterEditorChangeGroup, ExecuteAsGroupExtraData>(
    changeGroupStack,
    CharacterEditorChangeGroup.None,
    () => ({
        characterConfigurationId: null,
        patches: [],
        inversePatches: []
    }),
    () => {
        const currentStack = changeGroupStack[changeGroupStack.length - 1];
        const { currentChangeGroup, currentGroupId, queuedSideEffects, extraData } = currentStack;

        const { characterConfigurationId, patches, inversePatches } = extraData;
        if ((characterConfigurationId === null) && (patches.length === 0) && (inversePatches.length === 0)) {
            // Nothing happened. While this might be an error, it's also possible that despite starting the
            // group no changes were made at all.
            //console.log(`groupUndoableCharacterEditorChanges: No changes made in a CharacterEditorChangeGroup.${CharacterEditorChangeGroup[currentChangeGroup]} group.`);
            return;
        }

        executeUndoableOperation(new CharacterEditorSubmitCharacterConfigurationChangesOp(
            currentChangeGroup,
            currentGroupId,
            queuedSideEffects,
            characterConfigurationId,
            patches,
            inversePatches
        ));
    }
);

export function undoableCharacterEditorSubmitCharacterConfigurationsChanges(characterConfigurationId: number, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
    // Don't create undo entries while translations are importing
    if (translationStore.isImporting)
        return;

    const currentStack = changeGroupStack[changeGroupStack.length - 1];

    if (currentStack.currentChangeGroup !== CharacterEditorChangeGroup.None) {
        currentStack.extraData.patches.push(patch);
        currentStack.extraData.inversePatches.push(inversePatch);

        if (currentStack.extraData.characterConfigurationId !== null && currentStack.extraData.characterConfigurationId !== characterConfigurationId)
            throw new Error("Groups must have the same actionTree");

        currentStack.extraData.characterConfigurationId = characterConfigurationId;
        return;
    }

    const { currentChangeGroup, currentGroupId, queuedSideEffects } = currentStack;
    currentStack.queuedSideEffects = null;

    executeUndoableOperation(new CharacterEditorSubmitCharacterConfigurationChangesOp(
        currentChangeGroup,
        currentGroupId,
        queuedSideEffects,
        characterConfigurationId,
        [patch],
        [inversePatch]
    ));
}

class CharacterEditorSubmitCharacterConfigurationChangesOp extends UndoableOperation {
    public constructor(
        public group: CharacterEditorChangeGroup,
        public groupId: number,
        public sideEffects: UndoableOperationGroupSideEffect[],
        public characterConfigurationId: number,
        public patches: AugmentedPatch[],
        public inversePatches: AugmentedPatch[]
    ) {
        super("characterEditorSubmitChanges/changed");
        //super("characterEditorSubmitChanges/" + CharacterEditorChangeGroup[group]);
    }

    public async execute(isRedo: boolean) {
        await editorClient.submitCharacterConfigurationChanges(this.characterConfigurationId, this.patches, this.inversePatches);
        if (isRedo) {
            editorClient.patch(sharedStore.getCharacter(this.characterConfigurationId), this.patches);
        }

        selectCharacterOrThrow(charEditorStore, this.characterConfigurationId);

        this.sideEffects?.forEach(sideEffect => sideEffect.afterExecute(isRedo));
    }

    public async reverse() {
        const reversedInversePatches = this.inversePatches.slice().reverse();
        await editorClient.submitCharacterConfigurationChanges(this.characterConfigurationId, reversedInversePatches, this.patches.slice().reverse());
        editorClient.patch(sharedStore.getCharacter(this.characterConfigurationId), reversedInversePatches);

        selectCharacterOrThrow(charEditorStore, this.characterConfigurationId);

        this.sideEffects?.forEach(sideEffect => sideEffect.afterReverse());
    }

    public merge(previousOperation: CharacterEditorSubmitCharacterConfigurationChangesOp) {
        return mergeGroupedPatchOp(this, previousOperation, autoMergableGroups, CharacterEditorChangeGroup.None);
    }
}
