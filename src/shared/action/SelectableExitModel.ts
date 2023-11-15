import { model, Model, modelAction, prop } from "mobx-keystone";
import { TranslatedString } from "../game/TranslatedString";
import { ActionModel, TreeEnterActionModel } from "./ActionModel";
import { getTreeParent } from "./ActionTreeModel";
import { ConditionModel } from "./ConditionModel";

@model("resources/SelectableExitModel")
export class SelectableExitModel extends Model({
    value: prop<TranslatedString>(() => new TranslatedString({})),
    nextActions: prop<string[]>(() => []).withSetter(),
    hideCondition: prop<ConditionModel>(null)
}) {

    @modelAction
    public removeNextAction(actionId: string) {
        this.nextActions.splice(this.nextActions.indexOf(actionId), 1);
    }

    @modelAction
    public addNextAction(actionId: string) {
        if (!this.nextActions.includes(actionId)) {
            this.nextActions.push(actionId);
        }
    }

    @modelAction
    public toggleHideConditionActive() {
        if (this.hideCondition) {
            this.hideCondition = null;
        } else {
            this.hideCondition = new ConditionModel({});
        }
    }

    public yPositionInThisTree(action: ActionModel) {
        if (action instanceof TreeEnterActionModel)
            // For entry nodes, we need to use the position of the containing subtree
            return getTreeParent(action)?.position?.y || 0;

        return action?.position?.y || 0;
    }

    public hasNextActions() {
        return this.nextActions.length > 0;
    }
}
