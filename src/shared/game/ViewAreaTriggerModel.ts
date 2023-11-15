import { Model, model, prop } from "mobx-keystone";

@model("game/ViewAreaTriggerModel")
export class ViewAreaTriggerModel extends Model({
    rangeOfSight: prop<number>(1).withSetter(),
    directionForward: prop<boolean>(false).withSetter(),
    directionBackward: prop<boolean>(false).withSetter(),
    directionLeft: prop<boolean>(false).withSetter(),
    directionRight: prop<boolean>(false).withSetter(),
    name: prop<string>("").withSetter(),
    isModuleGate: prop<boolean>(false).withSetter()
}) {

}