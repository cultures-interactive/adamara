import { computed } from "mobx";
import { getParent, model, Model, prop, SnapshotOutOfModel } from "mobx-keystone";
import { InteractionTriggerData } from "./InteractionTriggerData";
import { TileDataModel } from "./TileDataModel";

export type TileDataInteractionTriggerInterface = InteractionTriggerData & {
    tileOffsetX: number;
    tileOffsetY: number;
};

@model("game/TileDataInteractionTriggerModel")
export class TileDataInteractionTriggerModel extends Model({
    isInteractionTrigger: prop<boolean>(true).withSetter(),
    isModuleGate: prop<boolean>(false).withSetter(),
    label: prop<string>("").withSetter(),
    tileOffsetX: prop<number>(0).withSetter(),
    tileOffsetY: prop<number>(0).withSetter()
}) implements TileDataInteractionTriggerInterface {
    @computed
    public get tileData(): TileDataModel {
        return getParent(this);
    }
}

export class ReadonlyTileDataInteractionTrigger implements TileDataInteractionTriggerInterface {
    public readonly $modelId: string;
    public readonly label: string;
    public readonly isInteractionTrigger: boolean;
    public readonly isModuleGate: boolean;
    public readonly tileOffsetX: number;
    public readonly tileOffsetY: number;

    public constructor(data: TileDataInteractionTriggerInterface) {
        this.$modelId = data.$modelId;
        this.label = data.label;
        this.isInteractionTrigger = data.isInteractionTrigger;
        this.isModuleGate = data.isModuleGate;
        this.tileOffsetX = data.tileOffsetX;
        this.tileOffsetY = data.tileOffsetY;
    }
}

export type TileDataInteractionTriggerSnapshot = SnapshotOutOfModel<TileDataInteractionTriggerModel>;