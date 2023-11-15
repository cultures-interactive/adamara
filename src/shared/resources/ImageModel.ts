import { Model, model, prop, SnapshotOutOf } from "mobx-keystone";
import { dataConstants } from "../data/dataConstants";
import { TranslatedError } from "../definitions/errors/TranslatedError";
import { SizeModel } from "./SizeModel";

export enum ImageUsecase {
    None,
    Item,
    DisplayImage
}

@model('game/ImageModel')
export class ImageModel extends Model({
    id: prop<number>(0).withSetter(),
    filename: prop<string>("").withSetter(),
    size: prop<SizeModel>().withSetter(),
    usecase: prop<ImageUsecase>(0).withSetter(),
    moduleOwner: prop<string>("").withSetter()
}) {
}

export function doesImageNeedTexture(imageSnapshot: ImageSnapshot) {
    switch (imageSnapshot.usecase) {
        case ImageUsecase.DisplayImage:
        case ImageUsecase.Item:
        case ImageUsecase.None:
            return false;

        default:
            throw new Error("Not implemented: " + imageSnapshot.usecase);
    }
}

export function throwIfImageSizeIsTooBig(usecase: ImageUsecase, imageSizeInBytes: number) {
    if (usecase === ImageUsecase.Item) {
        if (imageSizeInBytes > dataConstants.itemAssetMaxSizeBytes) {
            throw new TranslatedError("editor.error_image_size_too_large");
        }
    } else if (usecase === ImageUsecase.DisplayImage) {
        if (imageSizeInBytes > dataConstants.displayImageMaxSizeBytes) {
            throw new TranslatedError("editor.error_image_size_too_large");
        }
    } else {
        throw new Error("Not implemented: image usecase " + usecase);
    }
}

export type ImageSnapshot = SnapshotOutOf<ImageModel>;