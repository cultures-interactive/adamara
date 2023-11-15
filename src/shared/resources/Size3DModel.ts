import { computed } from "mobx";
import { model, Model, modelAction, prop } from "mobx-keystone";

export interface Size3D {
    x: number;
    y: number;
    z: number;
}

@model("resources/Size3DModel")
export class Size3DModel extends Model({
    x: prop<number>(1),
    y: prop<number>(1),
    z: prop<number>(1)
}) implements Size3D {
    @computed
    public get isFlatX() {
        return this.x <= 0;
    }

    @computed
    public get isFlatY() {
        return this.y <= 0;
    }

    @computed
    public get isFlatZ() {
        return this.z <= 0;
    }

    @computed
    public get isFlat() {
        return this.isFlatX || this.isFlatY || this.isFlatZ;
    }

    @modelAction
    public applyCeil() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        this.z = Math.ceil(this.z);
    }
}

export const unitSize3D: Size3D = {
    x: 1,
    y: 1,
    z: 1
};

export const flatUnitSize3D: Size3D = {
    x: 1,
    y: 1,
    z: 0
};
