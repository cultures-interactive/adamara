import { Model, model, prop, SnapshotOutOf } from "mobx-keystone";
import { TranslateableEntityData } from "../translation/TranslationDataTypes";
import { TranslatedString } from "./TranslatedString";

@model('game/ItemModel')
export class ItemModel extends Model({
    id: prop<string>("").withSetter(),
    name: prop<TranslatedString>(() => new TranslatedString({})),
    description: prop<TranslatedString>(() => new TranslatedString({})),
    tags: prop<string[]>(() => []).withSetter(),
    itemImageId: prop<number>(0).withSetter(),
    moduleOwner: prop<string>("").withSetter()
}) {
    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Item",
            translateableStrings: [
                { label: "Name", translatedString: this.name },
                { label: "Description", translatedString: this.description }
            ]
        } as TranslateableEntityData;
    }
}

export type ItemSnapshot = SnapshotOutOf<ItemModel>;
