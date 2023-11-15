import { model, Model, prop, SnapshotOutOfModel } from "mobx-keystone";
import { PixelPositionModel } from "./PixelPositionModel";
import { SizeModel } from "./SizeModel";

@model("resources/AssetModel")
export class ImagePropertiesModel extends Model({
    size: prop<SizeModel>(),
    positionOnTile: prop<PixelPositionModel>(() => new PixelPositionModel({})),
    frames: prop<number>(1).withSetter(),
    animationDuration: prop<number>(1).withSetter()
}) {

    public frameWidth() {
        return this.frames > 1 ? Math.floor(this.size.width / this.frames) : this.size.width;
    }
}

export type ImagePropertiesSnapshot = SnapshotOutOfModel<ImagePropertiesModel>;