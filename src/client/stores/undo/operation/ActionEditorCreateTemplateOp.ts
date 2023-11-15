import { UndoableOperation } from "../UndoableOperation";
import { editorClient } from "../../../communication/EditorClient";
import { executeUndoableOperation } from "../UndoStore";
import { ActionTreeModel, ActionTreeSnapshot, ActionTreeType } from "../../../../shared/action/ActionTreeModel";
import { actionTreeSetSelection, getCurrentlySelectedHierarchyIds, getCurrentReactFlowInstanceTransform, selectHierarchyFromIds } from "./actionEditorSupport";
import { actionEditorStore, allTemplatesCategory } from "../../ActionEditorStore";
import { FlowTransform } from "react-flow-renderer";
import { sharedStore } from "../../SharedStore";
import { getSnapshot } from "mobx-keystone";

export function undoableActionEditorCreateTemplate(source: ActionTreeModel) {
    const { copy, allNewTrees } = source.cloneWithNewIds(ActionTreeType.TemplateRoot);
    copy.resetPositionAndCleanParameters();
    for (const newTree of allNewTrees) {
        sharedStore.addActionTree(newTree);
    }
    executeUndoableOperation(new ActionEditorCreateTemplateOp(allNewTrees.map(newTree => getSnapshot(newTree))));
}

class ActionEditorCreateTemplateOp extends UndoableOperation {

    private readonly previousActionTreeHierarchy: string[];
    private readonly previousCategory: string;
    private readonly previousActionModelId: string;
    private readonly previousTransform: FlowTransform;

    public constructor(private readonly templateAndSubtrees: ActionTreeSnapshot[]) {
        super("actionEditorCreateTemplate");
        this.previousCategory = actionEditorStore.currentCategory;
        this.previousActionModelId = actionEditorStore.currentAction?.$modelId;
        this.previousActionTreeHierarchy = actionEditorStore.currentActionSelectionHierarchyIdsForUndo || getCurrentlySelectedHierarchyIds();
        this.previousTransform = actionEditorStore.currentActionSelectionTransformForUndo || getCurrentReactFlowInstanceTransform();
    }

    public async execute(isRedo: boolean) {
        actionEditorStore.clearClickActions();
        if (isRedo) {
            await editorClient.unDeleteActionTrees(this.templateAndSubtrees.map(tree => tree.$modelId));
        } else {
            await editorClient.createActionTrees(this.templateAndSubtrees);
        }
        actionEditorStore.deselectSelectedAction();
        selectHierarchyFromIds([this.templateAndSubtrees[0].$modelId]);
        actionEditorStore.setSelectedCategory(allTemplatesCategory);
    }

    public async reverse() {
        actionEditorStore.clearClickActions();
        await editorClient.deleteActionTrees(this.templateAndSubtrees);
        actionTreeSetSelection(this.previousActionModelId, this.previousActionTreeHierarchy, this.previousTransform);
        actionEditorStore.setSelectedCategory(this.previousCategory);
    }
}
