import { FlowTransform } from "react-flow-renderer";
import { actionEditorStore } from "../../ActionEditorStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { actionTreeSetSelection, getCurrentlySelectedHierarchyIds, getCurrentReactFlowInstanceTransform, selectHierarchyFromIds } from "./actionEditorSupport";

export function undoableActionEditorSelectActionTreeHierachy(actionTreeHierarchy: string[]) {
    actionEditorStore.clearClickActions();

    if (getCurrentlySelectedHierarchyIds() == actionTreeHierarchy)
        return;

    executeUndoableOperation(new ActionEditorSelectActionTreeHierachyOp(actionTreeHierarchy));
}

class ActionEditorSelectActionTreeHierachyOp extends UndoableOperation {
    private readonly previousActionTreeHierarchy: string[];
    private readonly previousActionModelId: string;
    private readonly previousTransform: FlowTransform;

    public constructor(
        private readonly actionTreeHierarchy: string[]
    ) {
        super("actionTreeHierarchySelectAction");
        this.previousActionTreeHierarchy = getCurrentlySelectedHierarchyIds();
        this.previousActionModelId = actionEditorStore.currentAction?.$modelId;
        this.previousTransform = getCurrentReactFlowInstanceTransform();
    }

    public async execute() {
        actionEditorStore.clearClickActions();
        actionEditorStore.deselectSelectedAction();
        selectHierarchyFromIds(this.actionTreeHierarchy);
    }

    public async reverse() {
        actionEditorStore.clearClickActions();
        actionTreeSetSelection(this.previousActionModelId, this.previousActionTreeHierarchy, this.previousTransform);
    }
}