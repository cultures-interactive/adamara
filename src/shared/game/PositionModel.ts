import { model, Model, modelAction, prop, SnapshotOutOf } from "mobx-keystone";
import { PlaneTransitModel } from "../resources/PlaneTransitModel";

export interface PositionInterface {
    readonly x: number;
    readonly y: number;
    readonly layer: number;
    readonly plane: number;

    clone(): PositionInterface;

    equals(x: number, y: number, layer: number, plane: number): boolean;

    /**
     * Returns true if this equals the assigned {@link PositionInterface}.
     * @param position The position to check.
     * @return True if this equals the assigned position.
     */
    equalsOther(position: PositionInterface): boolean;

    /**
     * Creates a copy of this {@link PositionInterface} and applies the assigned {@link PlaneTransitModel}.
     * @param planeTransit The transition to apply to the copy.
     * @return A copy of this position with the applied transition.
     */
    copyWithAppliedTransition(planeTransit: PlaneTransitModel): PositionInterface;

    /**
     * Returns a hash string of this {@link PositionModel}.
     * @return a hash string of this {@link PositionModel}.
     */
    toHash(): string;

    copyXY(): number[];
}

@model("game/PositionModel")
export class PositionModel extends Model({
    x: prop<number>(0).withSetter(),
    y: prop<number>(0).withSetter(),
    layer: prop<number>(0).withSetter(),
    plane: prop<number>(0).withSetter()
}) implements PositionInterface {
    @modelAction
    public set(x: number, y: number, layer: number, plane: number) {
        this.x = x;
        this.y = y;
        this.layer = layer;
        this.plane = plane;
        return this;
    }

    @modelAction
    public setXY(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    @modelAction
    public setXYPlane(x: number, y: number, plane: number) {
        this.x = x;
        this.y = y;
        this.plane = plane;
    }

    public clone() {
        return new PositionModel({ x: this.x, y: this.y, plane: this.plane, layer: this.layer });
    }

    public equals(x: number, y: number, layer: number, plane: number) {
        return this.x === x && this.y === y && this.layer === layer && this.plane === plane;
    }

    public equalsOther(position: PositionModel): boolean {
        return position && this.equals(position.x, position.y, position.layer, position.plane);
    }

    public copyWithAppliedTransition(planeTransit: PlaneTransitModel): PositionModel {
        return new PositionModel({
            x: this.x + planeTransit.targetXOffset,
            y: this.y + planeTransit.targetYOffset,
            plane: this.plane + planeTransit.heightDifference,
            layer: this.layer
        });
    }

    public toHash(): string {
        return this.x + "," + this.y + "," + this.layer + "," + this.plane;
    }

    public copyXY(): number[] {
        return [this.x, this.y];
    }
}

export class ReadonlyPosition implements PositionInterface {
    public readonly x: number;
    public readonly y: number;
    public readonly layer: number;
    public readonly plane: number;

    public constructor(data: Partial<PositionInterface>) {
        this.x = data.x || 0;
        this.y = data.y || 0;
        this.layer = data.layer || 0;
        this.plane = data.plane || 0;
    }

    public clone() {
        return new ReadonlyPosition({ x: this.x, y: this.y, plane: this.plane, layer: this.layer });
    }

    public equals(x: number, y: number, layer: number, plane: number) {
        return PositionModel.prototype.equals.call(this, x, y, layer, plane);
    }

    public equalsOther(position: PositionModel): boolean {
        return PositionModel.prototype.equalsOther.call(this, position);
    }

    public copyWithAppliedTransition(planeTransit: PlaneTransitModel) {
        return new ReadonlyPosition({
            x: this.x + planeTransit.targetXOffset,
            y: this.y + planeTransit.targetYOffset,
            plane: this.plane + planeTransit.heightDifference,
            layer: this.layer
        });
    }

    public toHash(): string {
        return PositionModel.prototype.toHash.call(this);
    }

    public copyXY(): number[] {
        return [this.x, this.y];
    }
}

export type PositionSnapshot = SnapshotOutOf<PositionModel>;
