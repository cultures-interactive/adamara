import { Model, model, prop } from "mobx-keystone";
import { TranslatedString } from "../game/TranslatedString";
import { Direction } from "../resources/DirectionHelper";
import { Gender } from "../definitions/other/Gender";

@model("actions/CutSceneTextModel")
export class CutSceneTextModel extends Model({
    text: prop<TranslatedString>(() => new TranslatedString({})).withSetter(),
    textContainerAlignmentDirection: prop<Direction>(null).withSetter(),
    textContainerWidthPercent: prop<number>(20).withSetter(),
    enabledTypeAnimation: prop<boolean>(true).withSetter(),
    textStyle: prop<number>(0).withSetter()
}) {

    public textToString(languageKey: string, gender: Gender) {
        if (!this.text) return "";
        return this.text.getForGender(languageKey, gender, true);
    }
}