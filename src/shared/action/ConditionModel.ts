import { model, Model, prop } from "mobx-keystone";
import { isBlank } from "../helper/generalHelpers";

export enum ConditionType {
    TreeVariable,
    GlobalVariable,
    Reputation,
    Item,
    Quest,
    Tag,
    Awareness,
    PlayerHealth,
    PlayStyle,
    ItemWithOneTag,
    ItemWithOneOfMultipleTags,
    ItemWithMultipleTags
}

export const conditionTypesTranslationKeys = [
    "action_editor.property_variable",
    "action_editor.property_variable_global",
    "action_editor.property_reputation",
    "action_editor.property_item",
    "action_editor.property_quest",
    "action_editor.property_tag",
    "action_editor.property_awareness",
    "action_editor.property_health",
    "action_editor.property_play_style",
    "content.item_selection_mode_ItemWithOneTag",
    "content.item_selection_mode_ItemWithOneOfMultipleTags",
    "content.item_selection_mode_ItemWithMultipleTags",
];

export enum ConditionOperator {
    Equals,
    NotEquals,
    GreaterThan,
    LessThan,
}

export const conditionOperatorLiterals = [
    "==",
    "!=",
    ">",
    "<",
];

@model("actions/EqualsConditionModel")
export class ConditionModel extends Model({
    conditionType: prop<ConditionType>(ConditionType.TreeVariable).withSetter(),
    variableName: prop<string>("").withSetter(),
    value: prop<string>("").withSetter(),
    operator: prop<ConditionOperator>(ConditionOperator.Equals).withSetter()
}) {

    public displayString() {
        return conditionTypesTranslationKeys[this.conditionType];
    }

    public isVariableSet(): boolean {
        return this.variableName.length > 0;
    }

    /**
     * Returns true if the data this condition is complete.
     * This depends on special cases depending on the condition type.
     */
    public get isDataComplete(): boolean {
        if (this.conditionType == ConditionType.Reputation) {
            // special case: For some reason the default variable name of this condition type is "Awareness"
            return this.variableName != "Awareness" && this.isVariableSet() && !isBlank(this.value);
        }
        if (this.conditionType == ConditionType.TreeVariable || this.conditionType == ConditionType.GlobalVariable) {
            // default case: Check for variable name and value.
            return this.isVariableSet() && !isBlank(this.value);
        }
        if (this.conditionType == ConditionType.Awareness || this.conditionType == ConditionType.PlayerHealth) {
            // special case Awareness: Variable name is not needed and is always empty. -> Only check for value.
            // special case PlayerHealth: variable name is "Player" by default and can be ignored here. -> Only check for value.
            return !isBlank(this.value);
        }
        // default case: The value is either blank or 1. Both values are allowed. -> No check for value.
        return this.isVariableSet();
    }
}
