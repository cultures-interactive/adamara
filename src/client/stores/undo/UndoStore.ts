import { action, makeAutoObservable, observable, runInAction } from "mobx";
import { TranslatedError } from "../../../shared/definitions/errors/TranslatedError";
import { removeElement } from "../../../shared/helper/generalHelpers";
import { ErrorType } from "../editor/ErrorNotification";
import { errorStore } from "../ErrorStore";
import { translationStore } from "../TranslationStore";
import { UndoableOperation } from "./UndoableOperation";

export enum ExecutionMode {
    UserTriggered,
    Undo,
    Redo
}

export class UndoStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });

        window.addEventListener("focusout", this.breakMerging);
        window.addEventListener("click", this.breakMerging);
        window.addEventListener("keydown", this.onKeyDown);
    }

    public undoQueue = observable.array<UndoableOperation>();
    public redoQueue = observable.array<UndoableOperation>();
    private runningOperationPromises = observable.array<Promise<void>>();
    private previousExecutionMode: ExecutionMode;
    private runningBlockingOperation: UndoableOperation;
    private queuedOperationCount: number = 0;

    private waitingForServerOverlayCounter: number = 0;

    public get showWaitingForServerOverlay() {
        return this.waitingForServerOverlayCounter > 0;
    }

    public clear() {
        this.undoQueue.clear();
        this.redoQueue.clear();
        this.runningOperationPromises.clear();
        this.runningBlockingOperation = null;
    }

    public execute(operation: UndoableOperation): Promise<void> {
        // If we are already running a blocking operation, we can't run this now.
        if (this.runningBlockingOperation) {
            const waitFor = this.runningBlockingOperation.executionPromise;
            const operationName = operation.name;
            const previousOperationName = this.runningBlockingOperation.name;
            return this.queueActionAfterRunningBlockingOperation(
                waitFor,
                () => this.execute(operation),
                () => errorStore.addError(ErrorType.General, "editor.queued_operation_skipped_because_previous_operation_failed", { operationName, previousOperationName })
            );
        }

        return this.internalExecute(operation, ExecutionMode.UserTriggered);
    }

    private executeUndoRedo(mode: ExecutionMode): Promise<void> {
        if (translationStore.isImporting) {
            const error = new TranslatedError("editor.cannot_undo_redo_while_importing_translation");
            errorStore.addErrorFromErrorObject(error);
            return Promise.reject(error);
        }

        const isUndo = (mode === ExecutionMode.Undo);
        const queue = isUndo ? this.undoQueue : this.redoQueue;
        if (queue.length === 0)
            return Promise.resolve();

        if (this.runningOperationPromises.length > 0) {
            const waitFor = Promise.all(this.runningOperationPromises.values());
            const errorCallback = isUndo
                ? () => errorStore.addError(ErrorType.General, "editor.queued_undo_skipped_because_previous_operation_failed")
                : () => errorStore.addError(ErrorType.General, "editor.queued_redo_skipped_because_previous_operation_failed");
            return this.queueActionAfterRunningBlockingOperation(
                waitFor,
                () => this.executeUndoRedo(mode),
                errorCallback
            );
        }

        if (this.previousExecutionMode === ExecutionMode.UserTriggered) {
            this.undoQueue.forEach(op => op.mayTryMerge = false);
        }

        const operation = queue.pop();

        const executePromise = this.internalExecute(operation, mode);
        executePromise.catch(action(() => queue.push(operation)));
        return executePromise;
    }

    private internalExecute(operation: UndoableOperation, mode: ExecutionMode) {
        this.previousExecutionMode = mode;

        if (mode === ExecutionMode.UserTriggered) {
            this.redoQueue.length = 0;
        }

        const reverseQueue = (mode === ExecutionMode.Undo) ? this.redoQueue : this.undoQueue;
        let operationPromise = runInAction(() => (mode === ExecutionMode.Undo) ? operation.reverse() : operation.execute(mode === ExecutionMode.Redo));

        //if ((mode !== ExecutionMode.UserTriggered) || operation.blocksUntilComplete) {
        if (mode !== ExecutionMode.UserTriggered) {
            this.runningBlockingOperation = operation;
        }

        operationPromise = operationPromise
            .then(async () => {
                if (mode === ExecutionMode.UserTriggered) {
                    await this.tryToMergeWithPreviousOperation(operation);
                }
            })
            .catch(action(e => {
                errorStore.addErrorFromErrorObject(e);

                // If this failed operation was user-triggered, we will make sure that the next operation
                // won't try to merge (as that might not make sense anymore considering the server likely
                // rejected it because a value had changed in the meantime).
                if (mode === ExecutionMode.UserTriggered) {
                    const operationIndex = reverseQueue.indexOf(operation);
                    if (operationIndex > 0) {
                        reverseQueue[operationIndex - 1].mayTryMerge = false;
                    }
                }

                removeElement(reverseQueue, operation);
                throw e;
            }))
            .finally(action(() => {
                removeElement(this.runningOperationPromises, operationPromise);
                if (this.runningBlockingOperation === operation) {
                    this.runningBlockingOperation = null;
                }
            }));

        operation.setExecutionPromise(operationPromise);
        this.runningOperationPromises.push(operationPromise);
        reverseQueue.push(operation);

        return operationPromise;
    }

    private queueActionAfterRunningBlockingOperation(waitFor: Promise<unknown>, runQueuedOperation: () => Promise<void>, previousOperationFailCallback: () => void): Promise<void> {
        // For now, we don't accept more than one queued operation, so reject anything afterwards.
        if (this.queuedOperationCount > 0) {
            errorStore.addError(ErrorType.General, "editor.wait_for_the_server");
            return Promise.reject("Cannot add more than one queue item");
        }

        this.queuedOperationCount++;
        this.waitingForServerOverlayCounter++;

        const queuedOperationPromise = waitFor
            // When the promise we wait for completes with any result, reduce queuedOperationCount by one because
            // a) if it succeeded we'll execute the queued operation now and
            // b) if it failed we don't want to execute the queued operation anymore.
            .finally(action(() => {
                this.queuedOperationCount--;
            }))
            // Only after the promise we wait for completes successfully, we'll run the queued operation.
            .then(runQueuedOperation)
            // If the promise we wait for fails OR if the queued operation completes with any result,
            // hide the "waiting for server" overlay.
            .finally(action(() => {
                this.waitingForServerOverlayCounter--;
            }));

        if (previousOperationFailCallback) {
            waitFor.catch(previousOperationFailCallback);
        }

        return queuedOperationPromise;
    }

    private async tryToMergeWithPreviousOperation(operation: UndoableOperation) {
        // Only try to merge if we *have* a previous operation (operationIndex > 0)
        // and if this operation is still in the queue and wasn't e.g. (operationIndex !== -1)
        // removed by a disconnect clearing the queue.
        const operationIndex = this.undoQueue.indexOf(operation);
        if (operationIndex <= 0)
            return;

        // Only try to merge if the previous operation says we may.
        const previousOperation = this.undoQueue[operationIndex - 1];
        if (!previousOperation.mayTryMerge)
            return;

        // Only try to merge if the previous operation is the same type.
        if (Object.getPrototypeOf(previousOperation) !== Object.getPrototypeOf(operation))
            return;

        try {
            // By now, the previous operation of the same type should have completed. But
            // to be sure, only try to merge once the previous operation has also been completed.
            await previousOperation.executionPromise;
        } catch {
            // The error in this executionPromise has already been taken care of elsewhere.
            // We can't merge anymore though, so we'll return.
            return;
        }

        // Try to merge.
        if (operation.merge(previousOperation)) {
            // Merge successful? Remove previous operation.
            runInAction(() => this.undoQueue.remove(previousOperation));
            //console.log(`Successfully merged ${operation.name}`);
        }
    }

    public get undoName() {
        if (!this.hasUndo)
            return "";

        return this.undoQueue[this.undoQueue.length - 1].name;
    }

    public get hasUndo() {
        return this.undoQueue.length > 0;
    }

    public undo() {
        this.executeUndoRedo(ExecutionMode.Undo)
            .catch(() => { }); // We've already taken care of the error by displaying it
    }

    public get redoName() {
        if (!this.hasRedo)
            return "";

        return this.redoQueue[this.redoQueue.length - 1].name;
    }

    public get hasRedo() {
        return this.redoQueue.length > 0;
    }

    public redo() {
        this.executeUndoRedo(ExecutionMode.Redo)
            .catch(() => { }); // We've already taken care of the error by displaying it
    }

    public breakMerging() {
        if (this.undoQueue.length > 0) {
            const latestUndoOperation = this.undoQueue[this.undoQueue.length - 1];
            latestUndoOperation.mayTryMerge = false;
        }
    }

    private onKeyDown(e: KeyboardEvent) {
        if (!e.ctrlKey)
            return;

        if (e.key === "z") {
            e.preventDefault();
            this.undo();
        }

        if (e.key === "y") {
            e.preventDefault();
            this.redo();
        }
    }
}

export const undoStore = new UndoStore();

export function executeUndoableOperation(operation: UndoableOperation): void {
    if (translationStore.isImporting)
        throw Error("Shouldn't create undo entries while translations are importing");

    undoStore.execute(operation)
        .catch(() => { }); // We've already taken care of the error by displaying it
}