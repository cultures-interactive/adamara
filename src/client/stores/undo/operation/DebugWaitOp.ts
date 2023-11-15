import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { wait } from "../../../../shared/helper/generalHelpers";

let callCounter: number = 1;

export function undoableDebugWait(seconds: number, blocking: boolean, failExecute: boolean, failUndo: boolean, failRedo: boolean) {
    executeUndoableOperation(new DebugWaitOp(callCounter++, seconds, blocking, failExecute, failUndo, failRedo));
}

class DebugWaitOp extends UndoableOperation {
    public constructor(
        callIndex: number,
        private seconds: number,
        blocking: boolean,
        private failExecute: boolean,
        private failUndo: boolean,
        private failRedo: boolean
    ) {
        super(`${blocking ? "blocking" : "non-blocking"}${failExecute ? " [fail execute]" : ""}${failUndo ? " [fail undo]" : ""}${failRedo ? " [fail redo]" : ""} debugWait ${seconds}s #${callIndex}`);
    }

    public async execute(isRedo: boolean) {
        await wait(this.seconds * 1000);

        if (this.failExecute)
            throw new Error("DebugWaitOp failed execute");

        if (this.failRedo && isRedo)
            throw new Error("DebugWaitOp failed redo");

        console.log("Executed: " + this.name);
    }

    public async reverse() {
        await wait(this.seconds * 1000);

        if (this.failUndo)
            throw new Error("DebugWaitOp failed undo");

        console.log("Reversed: " + this.name);
    }
}