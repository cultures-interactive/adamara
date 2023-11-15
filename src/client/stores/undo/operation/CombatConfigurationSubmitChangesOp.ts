import { EnemyCombatPresetModel } from "../../../../shared/combat/EnemyCombatPresetModel";
import { GesturePatternModel } from "../../../../shared/combat/gestures/GesturePatternModel";
import { AugmentedPatch } from "../../../../shared/helper/mobXHelpers";
import { editorClient } from "../../../communication/EditorClient";
import { combatEditorStore } from "../../CombatEditorStore";
import { combatStore } from "../../CombatStore";
import { translationStore } from "../../TranslationStore";
import { createChangeGroupStack, createGroupUndoableChangesFunction, mergeGroupedPatchOp, UndoableOperation, UndoableOperationGroupSideEffect } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { selectEnemyCombatPreset } from "./CombatEnemyCombatPresetSelectionOp";
import { selectGesturePattern } from "./CombatGesturePatternSelectionOp";

export enum CombatConfigurationUpdateChangeGroup {
    None,
    CreateEnemyCombatPreset,
    DeleteEnemyCombatPreset,
    CreateGesturePattern,
    DeleteGesturePattern
}

const autoMergableGroups: CombatConfigurationUpdateChangeGroup[] = [
    //CombatConfigurationUpdateChangeGroup.UnspecificGroupedNodeChanges
];

const changeGroupStack = createChangeGroupStack(CombatConfigurationUpdateChangeGroup.None);

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
export const groupUndoableCombatConfigurationChanges = createGroupUndoableChangesFunction(changeGroupStack, CombatConfigurationUpdateChangeGroup.None);

export function undoableCombatConfigurationCreateAndSelectEnemyCombatPreset() {
    const newPreset = new EnemyCombatPresetModel({});
    groupUndoableCombatConfigurationChanges(CombatConfigurationUpdateChangeGroup.CreateEnemyCombatPreset, () => {
        combatStore.config.addEnemyCombatPreset(newPreset);
    }, [
        new SelectEnemyCombatPresetSideEffect(newPreset.$modelId)
    ]);
}

export function undoableCombatConfigurationDeleteEnemyCombatPreset(preset: EnemyCombatPresetModel) {
    groupUndoableCombatConfigurationChanges(CombatConfigurationUpdateChangeGroup.DeleteEnemyCombatPreset, () => {
        combatStore.config.removeEnemyCombatPreset(preset);
    }, [
        new SelectEnemyCombatPresetSideEffect(null)
    ]);
}

export function undoableCombatConfigurationCreateAndSelectGesturePattern() {
    const newGesturePattern = new GesturePatternModel({});
    groupUndoableCombatConfigurationChanges(CombatConfigurationUpdateChangeGroup.CreateGesturePattern, () => {
        combatStore.config.addGesturePattern(newGesturePattern);
    }, [
        new SelectGesturePatternSideEffect(newGesturePattern.$modelId)
    ]);
}

export function undoableCombatConfigurationDeleteGesturePattern(gesturepattern: GesturePatternModel) {
    groupUndoableCombatConfigurationChanges(CombatConfigurationUpdateChangeGroup.DeleteGesturePattern, () => {
        combatStore.config.removeGesturePattern(gesturepattern);
    }, [
        new SelectGesturePatternSideEffect(null)
    ]);
}

export function undoableCombatConfigurationSubmitChanges(patch: AugmentedPatch, inversePatch: AugmentedPatch) {
    // Don't create undo entries while translations are importing
    if (translationStore.isImporting)
        return;

    const currentStack = changeGroupStack[changeGroupStack.length - 1];
    const { currentChangeGroup, currentGroupId, queuedSideEffects } = currentStack;
    currentStack.queuedSideEffects = null;

    executeUndoableOperation(new CombatConfigurationSubmitChangesOp(currentChangeGroup, currentGroupId, queuedSideEffects, [patch], [inversePatch]));
}

class CombatConfigurationSubmitChangesOp extends UndoableOperation {
    public constructor(
        public group: CombatConfigurationUpdateChangeGroup,
        public groupId: number,
        public sideEffects: UndoableOperationGroupSideEffect[],
        public patches: AugmentedPatch[],
        public inversePatches: AugmentedPatch[]
    ) {
        super("combatConfiguratorUpdateConfiguration/" + CombatConfigurationUpdateChangeGroup[group]);
        //console.log(`[${groupId}:${DynamicMapElementChangeGroup[group]}]`, { patches, inversePatches });
    }

    public async execute(isRedo: boolean) {
        await editorClient.submitCombatConfigurationChanges(this.patches, this.inversePatches, isRedo);
        if (isRedo) {
            editorClient.patch(combatStore.config, this.patches);
        }

        this.sideEffects?.forEach(sideEffect => sideEffect.afterExecute(isRedo));
    }

    public async reverse() {
        const reversedInversePatches = this.inversePatches.slice().reverse();
        await editorClient.submitCombatConfigurationChanges(reversedInversePatches, this.patches.slice().reverse(), true);
        editorClient.patch(combatStore.config, reversedInversePatches);

        this.sideEffects?.forEach(sideEffect => sideEffect.afterReverse());
    }

    public merge(previousOperation: CombatConfigurationSubmitChangesOp) {
        return mergeGroupedPatchOp(this, previousOperation, autoMergableGroups, CombatConfigurationUpdateChangeGroup.None);
    }
}

export class SelectEnemyCombatPresetSideEffect implements UndoableOperationGroupSideEffect {
    private readonly previousId: string;

    public constructor(
        private readonly id: string
    ) {
        this.previousId = combatEditorStore.selectedEnemyCombatPresetId;
    }

    public async afterExecute() {
        selectEnemyCombatPreset(this.id);
    }

    public async afterReverse() {
        selectEnemyCombatPreset(this.previousId);
    }
}

export class SelectGesturePatternSideEffect implements UndoableOperationGroupSideEffect {
    private readonly previousId: string;

    public constructor(
        private readonly id: string
    ) {
        this.previousId = combatEditorStore.selectedGesturePatternId;
    }

    public async afterExecute() {
        selectGesturePattern(this.id);
    }

    public async afterReverse() {
        selectGesturePattern(this.previousId);
    }
}