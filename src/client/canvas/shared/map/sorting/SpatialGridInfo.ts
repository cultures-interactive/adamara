import { Rectangle } from "pixi.js";

export class SpatialGridInfo {
    public currentBounds: Rectangle;
    public isDirty: boolean;
    public wasCountedAsVisibleElementDuringComparing: boolean;

    public constructor() {
        this.reset();
    }

    public reset() {
        this.currentBounds = undefined;
        this.isDirty = true;
        this.wasCountedAsVisibleElementDuringComparing = false;
    }
}