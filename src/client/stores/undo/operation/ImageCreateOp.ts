import { ImageUsecase } from "../../../../shared/resources/ImageModel";
import { editorClient } from "../../../communication/EditorClient";
import { imageStore } from "../../ImageStore";
import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";

export function undoableCreateImage(imageFile: File, usecase: ImageUsecase) {
    executeUndoableOperation(new ImageCreateOp(imageFile, usecase));
}

class ImageCreateOp extends UndoableOperation {
    private imageId: number;

    public constructor(
        private readonly imageFile: File,
        private readonly usecase: ImageUsecase
    ) {
        super("createImage");
    }

    public async execute() {
        if (this.imageId)
            await editorClient.undeleteImage(this.imageId);
        else
            this.imageId = await imageStore.provideImageFromLocalFilesystem(this.imageFile, this.usecase);
    }

    public async reverse() {
        await imageStore.deleteImage(this.imageId);
    }
}