import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { editorStore } from "../../EditorStore";

export function undoableSetUsername(username: string) {
    executeUndoableOperation(new SetUsernameOp(username));
}

class SetUsernameOp extends UndoableOperation {
    private previousUsername: string;

    public constructor(
        private username: string
    ) {
        super("setUsername");
        this.previousUsername = editorStore.username;
    }

    public async execute() {
        editorStore.setUsername(this.username);
        editorClient.setUsername(this.username);
    }

    public async reverse() {
        editorStore.setUsername(this.previousUsername);
        editorClient.setUsername(this.previousUsername);
    }

    public merge(previousOperation: SetUsernameOp) {
        this.previousUsername = previousOperation.previousUsername;
        return true;
    }
}