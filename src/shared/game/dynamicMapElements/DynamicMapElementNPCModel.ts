import { model, Model, modelAction, prop, SnapshotOutOf } from "mobx-keystone";
import { InteractionTriggerData } from "../InteractionTriggerData";
import { PositionModel, ReadonlyPosition } from "../PositionModel";
import { DynamicMapElementModel, DynamicMapElementInterface } from "./DynamicMapElement";
import { ViewAreaTriggerModel } from "../ViewAreaTriggerModel";
import { Direction } from "../../resources/DirectionHelper";

export interface DynamicMapElementNPCInterface extends DynamicMapElementInterface<ReadonlyDynamicMapElementNPC>, InteractionTriggerData {
    readonly $modelId: string;
    readonly characterId: number;
    readonly viewAreaTriggers: ViewAreaTriggerModel[];
    readonly initialFacingDirection: Direction;
}

@model("game/DynamicMapElementNPCModel")
export class DynamicMapElementNPCModel extends Model({
    position: prop<PositionModel>(),
    characterId: prop<number>(),
    label: prop<string>("").withSetter(),
    isInteractionTrigger: prop<boolean>(false).withSetter(),
    isModuleGate: prop<boolean>(false).withSetter(),
    viewAreaTriggers: prop<ViewAreaTriggerModel[]>(() => []),
    initialFacingDirection: prop<Direction>(Direction.East).withSetter()
}) implements DynamicMapElementModel<ReadonlyDynamicMapElementNPC>, DynamicMapElementNPCInterface {
    public createReadOnlyVersion(): ReadonlyDynamicMapElementNPC {
        return new ReadonlyDynamicMapElementNPC(this);
    }

    @modelAction
    public addViewAreaTrigger(trigger: ViewAreaTriggerModel) {
        this.viewAreaTriggers.push(trigger);
    }

    @modelAction
    public removeViewAreaTrigger(trigger: ViewAreaTriggerModel) {
        const index = this.viewAreaTriggers.indexOf(trigger);
        if (index > -1) this.viewAreaTriggers.splice(index, 1);
    }

}

export class ReadonlyDynamicMapElementNPC implements DynamicMapElementNPCInterface {
    public readonly $modelId: string;
    public position: ReadonlyPosition;
    public readonly characterId: number;
    public readonly label: string;
    public readonly isInteractionTrigger: boolean;
    public readonly isModuleGate: boolean;
    public readonly viewAreaTriggers: ViewAreaTriggerModel[];
    public readonly initialFacingDirection: Direction;

    public constructor(data: DynamicMapElementNPCInterface) {
        this.$modelId = data.$modelId;
        this.position = new ReadonlyPosition(data.position);
        this.characterId = data.characterId;
        this.label = data.label;
        this.isInteractionTrigger = data.isInteractionTrigger;
        this.isModuleGate = data.isModuleGate;
        this.viewAreaTriggers = data.viewAreaTriggers;
        this.initialFacingDirection = data.initialFacingDirection;
    }

    public createReadOnlyVersion() {
        return this;
    }
}

export type DynamicMapElementNPCSnapshot = SnapshotOutOf<DynamicMapElementNPCModel>;