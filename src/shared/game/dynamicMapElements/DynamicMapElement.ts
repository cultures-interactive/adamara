import { PositionModel, ReadonlyPosition } from "../PositionModel";

export interface DynamicMapElementModel<T extends DynamicMapElementInterface<T>> {
    $modelId: string;
    readonly $modelType: string;
    position: PositionModel;
    isInteractionTrigger: boolean;
    isModuleGate: boolean;
    createReadOnlyVersion(): T;
}

export interface DynamicMapElementInterface<T extends DynamicMapElementInterface<T>> {
    position: ReadonlyPosition;
    createReadOnlyVersion(): T;
}
