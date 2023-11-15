import { UndoableOperation } from "../UndoableOperation";
import { History } from 'history';
import { executeUndoableOperation } from "../UndoStore";
import { navigateTo } from "../../../helper/navigationHelpers";

export function undoableSwitchMode(to: string, history: History) {
    if (history.location.pathname === to)
        return;

    executeUndoableOperation(new SwitchModeOp(to, history));
}

class SwitchModeOp extends UndoableOperation {
    private previousUrl: string;

    public constructor(
        private to: string,
        private history: History
    ) {
        super("switchMode" + to);
        this.previousUrl = this.history.location.pathname;
    }

    public async execute() {
        navigateTo(this.history, this.to);
    }

    public async reverse() {
        navigateTo(this.history, this.previousUrl);
    }
}