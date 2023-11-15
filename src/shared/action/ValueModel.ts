import { Model, model, modelAction, prop } from "mobx-keystone";
import { Gender } from "../definitions/other/Gender";
import { TranslatedString } from "../game/TranslatedString";
import { AnimationElementReferenceModel, MapElementReferenceModel } from "./MapElementReferenceModel";
import { NPCReferenceModel } from "./NPCReferenceModel";
import { isBlank } from "../helper/generalHelpers";
import { computed } from "mobx";
import { ParsedPath } from "path";

export interface ValueModel {
    $modelType: string;
    $modelId: string;
    value: any;

    isSet(): boolean;

    title(): string;                   // Returns a translation key for a human readable name of this type
    get(languageKey: string, gender: Gender): string;  // Returns the value as a (possibly translated) string 
    //set(value: string, languageKey: string): void; // This is never used by the interface and would not work for TranslatedStringValueModel in the current form
    clean(): void;

    setValue(value: any): void;
}

@model("actions/StringValueModel")
export class StringValueModel extends Model({
    value: prop<string>("").withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_string";
    }

    public get() {
        return this.value;
    }

    @modelAction
    public set(value: string) {
        this.setValue(value);
    }

    @modelAction
    public clean() {
        this.value = "";
    }

    public isSet() {
        return !isBlank(this.value);
    }
}

@model("actions/NumberValueModel")
export class NumberValueModel extends Model({
    value: prop<string>("0").withSetter() // string, because this can also be set to a tree parameter
}) implements ValueModel {

    public title() {
        return "action_editor.property_number";
    }

    public get() {
        return "" + this.value;
    }

    @modelAction
    public set(value: string) {
        this.setValue(value);
    }

    @modelAction
    public clean() {
        this.value = "";
    }

    public isSet(): boolean {
        return !isBlank(this.value);
    }
}

@model("actions/ItemIdValueModel")
export class ItemIdValueModel extends Model({
    value: prop<string>("").withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_item";
    }

    public get() {
        return this.value;
    }

    @modelAction
    public set(value: string) {
        this.setValue(value);
    }

    @modelAction
    public clean() {
        this.value = "";
    }

    public isSet(): boolean {
        return !isBlank(this.value);
    }
}

@model("actions/ItemTagValueModel")
export class ItemTagValueModel extends Model({
    value: prop<string>("").withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_item_tag";
    }

    public get() {
        return this.value;
    }

    @modelAction
    public set(value: string) {
        this.setValue(value);
    }

    @modelAction
    public clean() {
        this.value = "";
    }

    public isSet(): boolean {
        return !isBlank(this.value);
    }
}

@model("actions/QuestIdValueModel")
export class QuestIdValueModel extends Model({
    value: prop<string>("").withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_quest";
    }

    public get() {
        return this.value;
    }

    @modelAction
    public set(value: string) {
        this.setValue(value);
    }

    @modelAction
    public clean() {
        this.value = "";
    }

    public isSet(): boolean {
        return !isBlank(this.value);
    }
}

@model("actions/PlayStyleValueModel")
export class PlayStyleValueModel extends Model({
    value: prop<string>("").withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_play_style";
    }

    public get() {
        return this.value;
    }

    @modelAction
    public set(value: string) {
        this.setValue(value);
    }

    @modelAction
    public clean() {
        this.value = "";
    }

    public isSet(): boolean {
        return !isBlank(this.value);
    }
}

@model("actions/FractionValueModel")
export class FactionValueModel extends Model({
    value: prop<string>("").withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_faction";
    }

    public get() {
        return this.value;
    }

    @modelAction
    public set(value: string) {
        this.setValue(value);
    }

    @modelAction
    public clean() {
        this.value = "";
    }

    public isSet(): boolean {
        return !isBlank(this.value);
    }
}

@model("actions/TranslatedStringValueModel")
export class TranslatedStringValueModel extends Model({
    value: prop<TranslatedString>(() => new TranslatedString({})).withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_text";
    }

    public get(languageKey: string, gender: Gender, useFallback = true) {
        return this.value.getForGender(languageKey, gender, useFallback);
    }

    /*
    @modelAction
    public set(value: string, languageKey: string) {
        this.value.set(languageKey, value);
    }
    */

    @modelAction
    public clean() {
        this.value = new TranslatedString({});
    }

    public isSet(): boolean {
        return !this.value.isCurrentLanguageEmpty();
    }
}

@model("actions/MapMarkerValueModel")
export class MapMarkerValueModel extends Model({
    value: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_map_marker";
    }

    public get() {
        return this.value.$modelId;
    }

    @modelAction
    public clean() {
        this.value = new MapElementReferenceModel({});
    }

    public isSet(): boolean {
        return this.value.isComplete();
    }
}

export const extendedMapMarkerValueModelTypesArray = ["actions/MapMarkerValueModel", "actions/NPCOnMapValueModel", "actions/EnemyOnMapValueModel", "actions/AreaTriggerValueModel", "actions/AnimationElementValueModel", "actions/ExtendedMapMarkerValueModel"];

@model("actions/ExtendedMapMarkerValueModel")
export class ExtendedMapMarkerValueModel extends Model({
    value: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_extended_map_marker";
    }

    public get() {
        return this.value.$modelId;
    }

    @modelAction
    public clean() {
        this.value = new MapElementReferenceModel({});
    }

    public isSet(): boolean {
        return this.value.isComplete();
    }
}

@model("actions/AreaTriggerValueModel")
export class AreaTriggerValueModel extends Model({
    value: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_area_trigger";
    }

    public get() {
        return this.value.$modelId;
    }

    @modelAction
    public clean() {
        this.value = new MapElementReferenceModel({});
    }

    public isSet(): boolean {
        return this.value.isComplete();
    }
}

@model("actions/InteractionTriggerValueModel")
export class InteractionTriggerValueModel extends Model({
    value: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_interaction_trigger";
    }

    public get() {
        return this.value.$modelId;
    }

    @modelAction
    public clean() {
        this.value = new MapElementReferenceModel({});
    }

    public isSet(): boolean {
        return this.value.isComplete();
    }
}

@model("actions/NPCValueModel")
export class NPCValueModel extends Model({
    value: prop<NPCReferenceModel>(() => new NPCReferenceModel({})).withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_npc";
    }

    public get() {
        return this.value.$modelId;
    }

    @modelAction
    public clean() {
        this.value = new NPCReferenceModel({});
    }

    public isSet(): boolean {
        return this.value.isComplete();
    }
}

@model("actions/NPCOnMapValueModel")
export class NPCOnMapValueModel extends Model({
    value: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_npc_on_map";
    }

    public get() {
        return this.value.$modelId;
    }

    @modelAction
    public clean() {
        this.value = new MapElementReferenceModel({});
    }

    public isSet(): boolean {
        return this.value.isComplete();
    }
}

@model("actions/EnemyOnMapValueModel")
export class EnemyOnMapValueModel extends Model({
    value: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_enemy_on_map";
    }

    public get() {
        return this.value.$modelId;
    }

    @modelAction
    public clean() {
        this.value = new MapElementReferenceModel({});
    }

    public isSet(): boolean {
        return this.value.isComplete();
    }
}

@model("actions/AnimationElementValueModel")
export class AnimationElementValueModel extends Model({
    value: prop<AnimationElementReferenceModel>(() => new AnimationElementReferenceModel({})).withSetter(),
    requiredAnimationNamesString: prop<string>(null).withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_animation_element";
    }

    public get() {
        return this.value.$modelId;
    }

    @modelAction
    public clean() {
        this.value = new AnimationElementReferenceModel({});
    }

    public isSet(): boolean {
        return this.value.isComplete();
    }

    @computed
    public get shouldSelectAnimationInTemplate() {
        return this.requiredAnimationNamesString === null;
    }

    @computed
    public get hasRequiredAnimationNames() {
        return this.requiredAnimationNamesString !== null;
    }

    @computed
    public get requiredAnimationNames() {
        return this.requiredAnimationNamesString.split(",").map(value => value.trim());
    }

    @modelAction
    public setShouldSelectAnimationInTemplate() {
        this.requiredAnimationNamesString = null;
    }

    @modelAction
    public setHasRequiredAnimationNames() {
        if (!this.hasRequiredAnimationNames) {
            this.requiredAnimationNamesString = "";
        }
    }
}

@model("actions/AnimationIdAndStateValueModel")
export class AnimationPropertiesValueModel extends Model({
    value: prop<string>(null).withSetter(), // value in this case is the animation asset name
    sequence: prop<string>(null).withSetter(),
    loop: prop(true).withSetter()
}) implements ValueModel {

    public title() {
        return "action_editor.property_animation";
    }

    public get() {
        return this.value;
    }

    @modelAction
    public clean() {
        this.value = null;
        this.sequence = null;
        this.loop = true;
    }

    public isSet(): boolean {
        return !isBlank(this.value) && !isBlank(this.sequence);
    }
}

@model("actions/SoundValueModel")
export class SoundValueModel extends Model({
    value: prop<ParsedPath>(null).withSetter(),
    treeParameter: prop<string>(null).withSetter(),
}) implements ValueModel {

    public title() {
        return "action_editor.property_sound";
    }

    public get() {
        return (this.value != null) ? this.value.base : null;
    }

    @modelAction
    public clean() {
        this.value = null;
    }

    public isSet(): boolean {
        return (this.value != null) || (this.treeParameter != null);
    }
}