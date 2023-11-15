import { actionEditorStore } from "../../ActionEditorStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableActionEditorSelectCategory(category: string) {
    actionEditorStore.clearClickActions();

    if (actionEditorStore.currentCategory === category)
        return;

    executeUndoableOperation(new ActionEditorSelectCategoryOp(category));
}

class ActionEditorSelectCategoryOp extends UndoableOperation {
    private readonly previousCategory: string;

    public constructor(
        private readonly category: string
    ) {
        super("actionEditorSelectCategory");
        this.previousCategory = actionEditorStore.currentCategory;
    }

    public async execute() {
        actionEditorStore.clearClickActions();
        actionEditorStore.setSelectedCategory(this.category);
    }

    public async reverse() {
        actionEditorStore.clearClickActions();
        actionEditorStore.setSelectedCategory(this.previousCategory);
    }
}