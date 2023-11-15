import { Model, model, prop } from "mobx-keystone";
import { GesturePointModel } from "./GesturePointModel";

@model("combat/CircleGestureModel")
export class CircleGestureModel extends Model({
    center: prop<GesturePointModel>(() => new GesturePointModel({})).withSetter(),
    radius: prop<number>(1).withSetter(),
}) { }