import { fromSnapshot, getSnapshot, model, Model, modelAction, prop, SnapshotOutOf } from "mobx-keystone";
import { computed } from "mobx";
import { Size3DModel } from "./Size3DModel";
import { adjustTileOffsetAndSizePrecision } from "../data/mapElementSorting";
import { TranslatedString } from "../game/TranslatedString";
import { TranslateableEntityData } from "../translation/TranslationDataTypes";

export enum AnimationType {
    None = 0,
    BodyType = 1,
    NPC = 3, // A character that can not be used as a player avatar (e.g. because of missing animation sequences)
    Map = 2,
    Cutscene = 4
}

@model("resources/AnimationAssetModel")
export class AnimationAssetModel extends Model({
    id: prop<number>(0),
    name: prop<string>(""),
    localizedName: prop<TranslatedString>(() => new TranslatedString({})),
    metaData: prop<AnimationMetaData>().withSetter(),
    createdAt: prop<Date>(),
    animationNames: prop<string[]>(null),

    scale: prop<number>(1).withSetter(),
    offsetX: prop<number>(0),
    offsetY: prop<number>(0),
    internalOffsetZ: prop<number>(0),
    size: prop<Size3DModel>(() => new Size3DModel({})).withSetter()
}) {

    public static readonly allTypeNames = Object.keys(AnimationType).filter(item => isNaN(Number(item)));

    /**
     * Creates a new empty {@link AnimationAssetSnapshot} with the assigned name.
     * @param name The unique name of the animation.
     * @return The snapshot.
     */
    public static newSnapshot(name: string): AnimationAssetSnapshot {
        return getSnapshot(new AnimationAssetModel({
            name: name,
            metaData: {
                type: AnimationType.None
            }
        }));
    }

    public static fromSnapshot(snapshot: AnimationAssetSnapshot): AnimationAssetModel {
        return fromSnapshot<AnimationAssetModel>(snapshot);
    }

    public isType(animationType: AnimationType): boolean {
        return this.metaData.type == animationType;
    }

    @computed
    public get typeName() {
        return AnimationType[this.metaData.type];
    }

    public setType(type: AnimationType) {
        this.setMetaData({
            type: type
        });
    }

    @modelAction
    public setOffsetX(value: number) {
        this.offsetX = adjustTileOffsetAndSizePrecision(value);
    }

    @modelAction
    public setOffsetY(value: number) {
        this.offsetY = adjustTileOffsetAndSizePrecision(value);
    }

    @modelAction
    public setInternalOffsetZ(value: number) {
        this.internalOffsetZ = adjustTileOffsetAndSizePrecision(value);
    }

    @modelAction
    public setSizeX(value: number) {
        this.size.x = adjustTileOffsetAndSizePrecision(value);
    }

    @modelAction
    public setSizeY(value: number) {
        this.size.y = adjustTileOffsetAndSizePrecision(value);
    }

    @modelAction
    public setSizeZ(value: number) {
        this.size.z = adjustTileOffsetAndSizePrecision(value);
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Animation",
            translateableStrings: [
                { label: "Name", translatedString: this.localizedName }
            ]
        } as TranslateableEntityData;
    }
}

export interface AnimationMetaData {
    type: AnimationType;
}

export type AnimationAssetSnapshot = SnapshotOutOf<AnimationAssetModel>;


