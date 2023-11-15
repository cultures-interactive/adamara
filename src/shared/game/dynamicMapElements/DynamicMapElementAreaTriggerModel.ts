import { model, Model, prop, SnapshotOutOf } from "mobx-keystone";
import { PositionModel, ReadonlyPosition } from "../PositionModel";
import { DynamicMapElementModel, DynamicMapElementInterface } from "./DynamicMapElement";

export interface DynamicMapElementAreaTriggerInterface extends DynamicMapElementInterface<ReadonlyDynamicMapElementAreaTrigger> {
    readonly id: string;
    readonly $modelId: string;
}

@model("game/DynamicMapElementAreaTriggerModel")
export class DynamicMapElementAreaTriggerModel extends Model({
    position: prop<PositionModel>(),
    id: prop<string>("").withSetter(),
    isModuleGate: prop<boolean>(false).withSetter()
}) implements DynamicMapElementModel<ReadonlyDynamicMapElementAreaTrigger>, DynamicMapElementAreaTriggerInterface {

    public get isInteractionTrigger() {
        return false;
    }

    public createReadOnlyVersion(): ReadonlyDynamicMapElementAreaTrigger {
        return new ReadonlyDynamicMapElementAreaTrigger(this);
    }
}

export class ReadonlyDynamicMapElementAreaTrigger implements DynamicMapElementAreaTriggerInterface {
    public position: ReadonlyPosition;
    public readonly id: string;
    public readonly $modelId: string;

    public constructor(data: DynamicMapElementAreaTriggerInterface) {
        this.position = new ReadonlyPosition(data.position);
        this.id = data.id;
        this.$modelId = data.$modelId;
    }

    public createReadOnlyVersion() {
        return this;
    }
}

export type DynamicMapElementAreaTriggerSnapshot = SnapshotOutOf<DynamicMapElementAreaTriggerModel>;