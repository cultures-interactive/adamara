import { model, Model, prop } from "mobx-keystone";

@model("actions/NPCReferenceModel")
export class NPCReferenceModel extends Model({
    npcId: prop<string>("-1").withSetter(),
    npcName: prop<string>("").withSetter()
}) {

    public isComplete() {
        return this.npcId != "-1";
    }

}