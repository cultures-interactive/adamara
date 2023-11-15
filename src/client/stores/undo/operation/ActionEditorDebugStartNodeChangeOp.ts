import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { DebugStartActionModel } from "../../../../shared/action/ActionModel";
import { gameStore } from "../../GameStore";
import { actionEditorStore } from "../../ActionEditorStore";

export function undoableSetDebugStartNodeOp(debugStartNode: DebugStartActionModel) {
    executeUndoableOperation(new ActionEditorDebugStartNodeChangeOp(debugStartNode.$modelId));
}

class ActionEditorDebugStartNodeChangeOp extends UndoableOperation {
    private readonly previousDebugStartNodeModelId: string;

    public constructor(
        private debugStartNodeModelId: string,
    ) {
        super("changeDebugStartNode");
        this.previousDebugStartNodeModelId = gameStore.debugStartNodeModelId;
    }

    public async execute() {
        actionEditorStore.clearClickActions();
        gameStore.setDebugStartNodeModelId(this.debugStartNodeModelId);
    }

    public async reverse() {
        actionEditorStore.clearClickActions();
        gameStore.setDebugStartNodeModelId(this.previousDebugStartNodeModelId);
    }
}
