import { model, Model, prop } from "mobx-keystone";

@model("resources/SizeModel")
export class SizeModel extends Model({
    width: prop<number>().withSetter(),
    height: prop<number>().withSetter(),
}) {
}
