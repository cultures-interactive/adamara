import { model, Model, modelAction, prop } from "mobx-keystone";
import { CircleGestureModel } from "./CircleGestureModel";
import { LineGestureModel } from "./LineGestureModel";

@model("combat/GesturePatternModel")
export class GesturePatternModel extends Model({
    precision: prop<number>(5).withSetter(),
    missTolerance: prop<number>(20).withSetter(),
    keySequence: prop<string>("WASD").withSetter(),
    gestures: prop<Gesture[]>(() => [])
}) {

    @modelAction
    public removeGesture(index: number) {
        this.gestures.splice(index, 1);
    }

    @modelAction
    public addLineGesture() {
        this.gestures.push(new LineGestureModel({}));
    }

    @modelAction
    public addCircleGesture() {
        this.gestures.push(new CircleGestureModel({}));
    }
}

export type Gesture = LineGestureModel | CircleGestureModel;