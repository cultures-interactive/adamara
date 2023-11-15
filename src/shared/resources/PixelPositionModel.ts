import { model, Model, prop } from "mobx-keystone";

@model("resources/PixelPositionModel")
export class PixelPositionModel extends Model({
    x: prop<number>(0).withSetter(),
    y: prop<number>(0).withSetter(),
}) {
}
