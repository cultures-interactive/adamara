import { model, Model, prop } from "mobx-keystone";
import { ParsedPath } from "path";

export interface MapDataPropertiesInterface {
    readonly name: string;
    readonly sortingPriority: number;
    readonly shouldShowWater: boolean;
    readonly backgroundSoundFilePath: ParsedPath;
}

@model("game/MapDataPropertiesModel")
export class MapDataPropertiesModel extends Model({
    name: prop<string>("").withSetter(),
    sortingPriority: prop<number>(0).withSetter(),
    shouldShowWater: prop<boolean>(true).withSetter(),
    backgroundSoundFilePath: prop<ParsedPath>(null).withSetter(),
}) implements MapDataPropertiesInterface {
}

export class ReadonlyMapDataProperties implements MapDataPropertiesInterface {
    public readonly name: string;
    public readonly sortingPriority: number;
    public readonly shouldShowWater: boolean;
    public readonly backgroundSoundFilePath: ParsedPath;

    public constructor(data: MapDataPropertiesInterface) {
        this.name = data.name;
        this.sortingPriority = data.sortingPriority;
        this.shouldShowWater = data.shouldShowWater;
        this.backgroundSoundFilePath = data.backgroundSoundFilePath;
    }
}
