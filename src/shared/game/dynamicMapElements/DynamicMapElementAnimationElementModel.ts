import { model, Model, prop, SnapshotOutOf } from "mobx-keystone";
import { InteractionTriggerData } from "../InteractionTriggerData";
import { PositionModel, ReadonlyPosition } from "../PositionModel";
import { DynamicMapElementModel, DynamicMapElementInterface } from "./DynamicMapElement";

export interface DynamicMapElementAnimationElementInterface extends DynamicMapElementInterface<ReadonlyDynamicMapElementAnimationElement>, InteractionTriggerData {
    readonly $modelId: string;
    readonly animationName: string;
    readonly startAnimationName: string;
    readonly startAnimationLoops: boolean;
}

@model("game/DynamicMapElementAnimationElementModel")
export class DynamicMapElementAnimationElementModel extends Model({
    position: prop<PositionModel>(),
    animationName: prop<string>(),
    startAnimationName: prop<string>("").withSetter(),
    startAnimationLoops: prop<boolean>(true).withSetter(),
    label: prop<string>("").withSetter(),
    isInteractionTrigger: prop<boolean>(false).withSetter(),
    isModuleGate: prop<boolean>(false).withSetter()
}) implements DynamicMapElementModel<ReadonlyDynamicMapElementAnimationElement>, DynamicMapElementAnimationElementInterface {

    public createReadOnlyVersion(): ReadonlyDynamicMapElementAnimationElement {
        return new ReadonlyDynamicMapElementAnimationElement(this);
    }
}

export class ReadonlyDynamicMapElementAnimationElement implements DynamicMapElementAnimationElementInterface {
    public readonly $modelId: string;
    public readonly position: ReadonlyPosition;
    public readonly animationName: string;
    public readonly startAnimationName: string;
    public readonly startAnimationLoops: boolean;
    public readonly label: string;
    public readonly isInteractionTrigger: boolean;
    public readonly isModuleGate: boolean;

    public constructor(data: DynamicMapElementAnimationElementInterface) {
        this.$modelId = data.$modelId;
        this.position = new ReadonlyPosition(data.position);
        this.animationName = data.animationName;
        this.startAnimationName = data.startAnimationName;
        this.startAnimationLoops = data.startAnimationLoops;
        this.label = data.label;
        this.isInteractionTrigger = data.isInteractionTrigger;
        this.isModuleGate = data.isModuleGate;
    }

    public createReadOnlyVersion() {
        return this;
    }
}

export type DynamicMapElementAnimationElementSnapshot = SnapshotOutOf<DynamicMapElementAnimationElementModel>;