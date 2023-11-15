import { Model, model, prop, SnapshotOutOf } from "mobx-keystone";

@model("game/GameDesignVariablesModel/ReputationDeltaValueModel")
export class ReputationDeltaValueModel extends Model({
    Small: prop<number>(5).withSetter(),
    Reasonable: prop<number>(10).withSetter(),
    Large: prop<number>(20).withSetter()
}) { }

export type ReputationDeltaValueModelKey = "Small" | "Reasonable" | "Large";

@model("game/GameDesignVariablesModel")
export class GameDesignVariablesModel extends Model({
    reputationAmountBalance: prop<ReputationDeltaValueModel>(() => new ReputationDeltaValueModel({})),
    reputationActBalance: prop<number[]>(() => [1, 1, 1, 1, 1]).withSetter(),
    reputationBalanceFactor: prop<number>(1).withSetter(),
    gameStartingMapId: prop<number>(null).withSetter()
}) {

}

export type GameDesignVariablesSnapshot = SnapshotOutOf<GameDesignVariablesModel>;