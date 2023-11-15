import { Model, model, prop } from "mobx-keystone";
import { GesturePointModel } from "./GesturePointModel";

@model("combat/LineGestureModel")
export class LineGestureModel extends Model({
    from: prop<GesturePointModel>(() => new GesturePointModel({})).withSetter(),
    to: prop<GesturePointModel>(() => new GesturePointModel({})).withSetter(),
}) { }