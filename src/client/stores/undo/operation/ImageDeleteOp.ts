import { editorClient } from "../../../communication/EditorClient";
import { imageStore } from "../../ImageStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableDeleteImage(imageId: number) {
    executeUndoableOperation(new ImageDeleteOp(imageId));
}

class ImageDeleteOp extends UndoableOperation {
    public constructor(
        private readonly imageId: number
    ) {
        super("deleteImage");
    }

    public async execute() {
        await imageStore.deleteImage(this.imageId);
    }

    public async reverse() {
        await editorClient.undeleteImage(this.imageId);
    }
}