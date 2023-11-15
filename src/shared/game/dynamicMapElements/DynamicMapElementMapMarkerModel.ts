import { model, Model, prop, SnapshotOutOf } from "mobx-keystone";
import { PositionModel, ReadonlyPosition } from "../PositionModel";
import { DynamicMapElementModel, DynamicMapElementInterface } from "./DynamicMapElement";

export interface DynamicMapElementMapMarkerInterface extends DynamicMapElementInterface<ReadonlyDynamicMapElementMapMarker> {
    readonly label: string;
    readonly $modelId: string;
}

@model("game/DynamicMapElementMapMarkerModel")
export class DynamicMapElementMapMarkerModel extends Model({
    position: prop<PositionModel>(),
    label: prop<string>("").withSetter()
}) implements DynamicMapElementModel<ReadonlyDynamicMapElementMapMarker>, DynamicMapElementMapMarkerInterface {

    public get isInteractionTrigger() {
        return false;
    }

    public get isModuleGate() {
        return false;
    }

    public createReadOnlyVersion(): ReadonlyDynamicMapElementMapMarker {
        return new ReadonlyDynamicMapElementMapMarker(this);
    }
}

export class ReadonlyDynamicMapElementMapMarker implements DynamicMapElementMapMarkerInterface {
    public position: ReadonlyPosition;
    public readonly label: string;
    public readonly $modelId: string;

    public constructor(data: DynamicMapElementMapMarkerInterface) {
        this.position = new ReadonlyPosition(data.position);
        this.label = data.label;
        this.$modelId = data.$modelId;
    }

    public createReadOnlyVersion() {
        return this;
    }
}

export type DynamicMapElementMapMarkerSnapshot = SnapshotOutOf<DynamicMapElementMapMarkerModel>;