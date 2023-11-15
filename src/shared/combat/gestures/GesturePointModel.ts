import { model, Model, prop } from "mobx-keystone";

@model("combat/PatternPointModel")
export class GesturePointModel extends Model({
    x: prop<number>(0).withSetter(),
    y: prop<number>(0).withSetter()
}) { }
