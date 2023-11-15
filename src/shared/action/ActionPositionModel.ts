import { model, Model, modelAction, prop } from "mobx-keystone";

@model("actions/ActionPositionModel")
export class ActionPositionModel extends Model({
    x: prop<number>(0).withSetter(),
    y: prop<number>(0).withSetter(),
}) {

    @modelAction
    public set(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    @modelAction
    public move(deltaX: number, deltaY: number) {
        this.x += deltaX;
        this.y += deltaY;
    }
}
