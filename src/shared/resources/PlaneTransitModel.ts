import { model, Model, prop } from "mobx-keystone";
import { Direction, DirectionHelper } from "./DirectionHelper";

@model("resources/PlaneTransitModel")
export class PlaneTransitModel extends Model({
    direction: prop<Direction>().withSetter(),
    heightDifference: prop<number>(0).withSetter(),
    targetXOffset: prop<number>(0).withSetter(),
    targetYOffset: prop<number>(0).withSetter(),
}) {

    /**
     * Returns true if this {@link PlaneTransitModel} is initialized.
     * @return True if this is initialized.
     */
    public isInitialized(): boolean {
        return this.heightDifference > 0;
    }

    /**
     * Creates a 'counter part' of this {@link PlaneTransitModel}.
     * It is located at the target position, pointing to the opposite direction
     * and to the opposite height difference.
     * @return The transit model.
     */
    public createCounterPart(): PlaneTransitModel {
        return new PlaneTransitModel({
            heightDifference: this.heightDifference * -1,
            targetXOffset: this.targetXOffset * -1,
            targetYOffset: this.targetYOffset * -1,
            direction: DirectionHelper.getOpposite(this.direction)
        });
    }
}

