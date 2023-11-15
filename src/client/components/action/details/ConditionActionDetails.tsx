import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { ConditionModel, ConditionOperator, conditionOperatorLiterals, ConditionType, conditionTypesTranslationKeys } from '../../../../shared/action/ConditionModel';
import { ActionScope, factions, playStyles } from '../../../../shared/action/ActionModel';
import { ActionEditorChangeGroup, groupUndoableActionEditorChanges } from '../../../stores/undo/operation/ActionEditorSubmitChangesOp';
import { Dropdown } from "../../editor/Dropdown";
import { Input } from "../../editor/Input";
import { formatTreeParameter, parseFormattedTreeParameter } from "../../../../shared/helper/actionTreeHelper";
import { isBlank } from "../../../../shared/helper/generalHelpers";
import { gameStore } from '../../../stores/GameStore';
import { itemStore } from '../../../stores/ItemStore';
import { sharedStore } from '../../../stores/SharedStore';
import { ActionTreeModel, getTreeParentOfClosestActionModel } from '../../../../shared/action/ActionTreeModel';
import { getActionShortDescriptionForActionEditor } from '../../../helper/actionEditorHelpers';
import { actionEditorStore } from '../../../stores/ActionEditorStore';
import { ElementGroup } from './components/BaseElements';

export function isNumberVariableInScope(parentTree: ActionTreeModel, variableName: string, scope: ActionScope) {
    const tree = scope === ActionScope.Tree ? parentTree : sharedStore.mainGameRootActionTree;
    return [...tree.variableValues(variableName, scope)].every(v => !isNaN(Number(v)) || isNumberParameter(parentTree, parseFormattedTreeParameter(v)));
}

function isNumberVariable(parentTree: ActionTreeModel, variableName: string, conditionType: ConditionType) {
    const scope = conditionType === ConditionType.TreeVariable ? ActionScope.Tree : ActionScope.Global;
    return isNumberVariableInScope(parentTree, variableName, scope);
}

function isNumberParameter(parentTree: ActionTreeModel, parameterName: string) {
    return !!parentTree.treeParameterActions("actions/NumberValueModel").find(a => a.name === parameterName);
}

interface ActionParameterConditionProps {
    condition: ConditionModel;
}

export const ActionParameterSelectConditionType: React.FunctionComponent<ActionParameterConditionProps> = observer(({ condition }) => {
    const { t } = useTranslation();

    const setConditionTypeAndInitialValues = (conditionType: ConditionType) => {
        groupUndoableActionEditorChanges(ActionEditorChangeGroup.UnspecificGroupedNodeChanges, () => {
            condition.setConditionType(conditionType);
            condition.setVariableName("");
            condition.setOperator(ConditionOperator.Equals);
            condition.setValue("");
        });
    };

    return (
        <Dropdown value={condition.conditionType} onChange={({ target }) => setConditionTypeAndInitialValues(parseInt(target.value))}>
            {conditionTypesTranslationKeys.map((varType, index) => <option key={index} value={index}>{t(varType)}</option>)}
        </Dropdown>
    );
});

export const ActionParameterSelectVariable: React.FunctionComponent<ActionParameterConditionProps> = observer(({ condition }) => {
    const { t } = useTranslation();
    const { mainGameRootActionTree } = sharedStore;
    const { currentRootActionTree } = actionEditorStore;
    const { languageKey } = gameStore;

    const parentTree = getTreeParentOfClosestActionModel(condition, true);

    let allVariables: string[];
    let allVariableLiterals: string[];
    switch (condition.conditionType) {
        case ConditionType.TreeVariable:
            allVariables = [...parentTree.variableNames(ActionScope.Tree)];
            allVariableLiterals = allVariables;
            break;
        case ConditionType.GlobalVariable:
            allVariables = [...mainGameRootActionTree.variableNames(ActionScope.Global)];
            allVariableLiterals = allVariables;
            break;
        case ConditionType.Tag:
            allVariables = ["", ...mainGameRootActionTree.globalTags()];
            if (mainGameRootActionTree !== currentRootActionTree) {
                allVariables.push(...currentRootActionTree.globalTags());
            }
            allVariableLiterals = allVariables;
            break;
        case ConditionType.PlayStyle:
            const playStyleParameters = parentTree.treeParameterActions("actions/PlayStyleValueModel").map(a => formatTreeParameter(a.name));
            allVariables = ["", ...playStyles, ...playStyleParameters];
            allVariableLiterals = ["", ...playStyles.map(f => t("content.play_style_" + f)), ...playStyleParameters];
            break;
        case ConditionType.Reputation:
            const factionParamters = parentTree.treeParameterActions("actions/FactionValueModel").map(a => formatTreeParameter(a.name));
            allVariables = ["", ...factions, ...factionParamters];
            allVariableLiterals = ["", ...factions.map(f => t("content.faction_" + f)), ...factionParamters];
            break;
        case ConditionType.Awareness:
            allVariables = ["Awareness"];
            allVariableLiterals = [];
            break;
        case ConditionType.PlayerHealth:
            allVariables = ["Player"];
            allVariableLiterals = [];
            break;
        case ConditionType.Item:
            const itemParamters = parentTree.treeParameterActions("actions/ItemIdValueModel").map(a => formatTreeParameter(a.name));
            allVariables = ["", ...itemStore.getAllItems.map(i => i.id), ...itemParamters];
            allVariableLiterals = ["", ...itemStore.getAllItems.map(i => i.name.get(languageKey)), ...itemParamters];
            break;
        case ConditionType.ItemWithOneTag:
            const itemTagParamters = parentTree.treeParameterActions("actions/ItemTagValueModel").map(a => formatTreeParameter(a.name));
            allVariables = ["", ...itemStore.getAllItemTags(), ...itemTagParamters];
            allVariableLiterals = allVariables;
            break;
        case ConditionType.ItemWithMultipleTags:
        case ConditionType.ItemWithOneOfMultipleTags:
            allVariables = null;
            allVariableLiterals = null;
            break;
        case ConditionType.Quest:
            const questParameters = parentTree.treeParameterActions("actions/QuestIdValueModel").map(p => formatTreeParameter(p.name));
            const quests = parentTree.quests(mainGameRootActionTree);
            allVariables = ["", ...quests.map(a => a.$modelId), ...questParameters];
            allVariableLiterals = ["", ...quests.map(a => getActionShortDescriptionForActionEditor(a, t)), ...questParameters];
            break;
    }

    const setVariableAndInitialValue = (variableName: string) => {
        groupUndoableActionEditorChanges(ActionEditorChangeGroup.UnspecificGroupedNodeChanges, () => {
            const scope = ConditionType.TreeVariable ? ActionScope.Tree : ActionScope.Global;
            if (isNumberVariable(parentTree, variableName, condition.conditionType) !== isNumberVariable(parentTree, condition.variableName, condition.conditionType)) {
                condition.setOperator(ConditionOperator.Equals);
            }
            condition.setVariableName(variableName);
            condition.setValue("");
        });
    };

    return (
        <>
            {
                allVariableLiterals?.length > 0 && (
                    <Dropdown
                        className={condition.isVariableSet() ? "" : "invalid"}
                        value={condition.variableName}
                        onChange={({ target }) => setVariableAndInitialValue(target.value)}
                    >
                        {allVariables.map((variableName, index) => <option key={index} value={variableName}>{allVariableLiterals[index]}</option>)}
                    </Dropdown>
                )
            }
            {
                !allVariables && (
                    <Input
                        className={condition.isVariableSet() ? "" : "invalid"}
                        type="text" value={condition.variableName}
                        onChange={({ target }) => setVariableAndInitialValue(target.value)}
                    />
                )
            }
        </>
    );
});

export const ActionParameterSelectOperator: React.FunctionComponent<ActionParameterConditionProps> = observer(({ condition }) => {
    let operators: number[];
    switch (condition.conditionType) {
        case ConditionType.TreeVariable:
        case ConditionType.GlobalVariable:
            if (isNumberVariable(getTreeParentOfClosestActionModel(condition, true), condition.variableName, condition.conditionType)) {
                operators = [...Array(conditionOperatorLiterals.length).keys()]; // Numbers: all operators
            } else {
                operators = [ConditionOperator.Equals, ConditionOperator.NotEquals];
            }
            break;
        case ConditionType.Reputation:
        case ConditionType.Awareness:
        case ConditionType.PlayerHealth:
            operators = [...Array(conditionOperatorLiterals.length).keys()]; // Numbers: all operators
            break;
        default:
            operators = [ConditionOperator.Equals];
            break;
    }

    const setOperator = (conditionOperator: ConditionOperator) => {
        condition.setOperator(conditionOperator);
    };

    return (
        <Dropdown value={condition.operator} onChange={({ target }) => setOperator(parseInt(target.value))}>
            {operators.map(op => <option key={op} value={op}>{conditionOperatorLiterals[op]}</option>)}
        </Dropdown>
    );
});

export const ActionParameterSelectVariableValue: React.FunctionComponent<ActionParameterConditionProps> = observer(({ condition }) => {
    const { t } = useTranslation();
    const tree = condition.conditionType === ConditionType.TreeVariable ? getTreeParentOfClosestActionModel(condition, true) : sharedStore.mainGameRootActionTree;

    let values: string[]; // setting this to 'null' means accepting a positive number or a tree parameter (%param%) as input
    let valueLiterals: string[];
    let unit = "";
    switch (condition.conditionType) {
        case ConditionType.TreeVariable:
        case ConditionType.GlobalVariable:
            values = [...tree.variableValues(condition.variableName, condition.conditionType === ConditionType.TreeVariable ? ActionScope.Tree : ActionScope.Global)];
            // if all values are numbers, the variable is handled as number (variableValues=null)
            values = isNumberVariable(getTreeParentOfClosestActionModel(condition, true), condition.variableName, condition.conditionType) ? null : values;
            valueLiterals = values;
            break;
        case ConditionType.Reputation:
            unit = "%";
        case ConditionType.Awareness:
        case ConditionType.PlayerHealth:
            values = null;
            valueLiterals = null;
            break;
        case ConditionType.Item:
        case ConditionType.ItemWithOneTag:
        case ConditionType.ItemWithMultipleTags:
        case ConditionType.ItemWithOneOfMultipleTags:
            values = ["", "1"];
            valueLiterals = [t("action_editor.property_item_not_owned"), t("action_editor.property_item_owned")];
            break;
        case ConditionType.Quest:
            values = ["", "1"];
            valueLiterals = [t("action_editor.property_quest_not_active"), t("action_editor.property_quest_active")];
            break;
        case ConditionType.PlayStyle:
            values = ["", "1"];
            valueLiterals = [t("action_editor.property_play_style_not_set"), t("action_editor.property_play_style_set")];
            break;
        case ConditionType.Tag:
            values = ["", "1"];
            valueLiterals = [t("action_editor.property_tag_not_set"), t("action_editor.property_tag_set")];
            break;
    }

    const setValue = (value: string) => {
        condition.setValue(value);
    };

    return (<>
        {values && <Dropdown value={condition.value} onChange={({ target }) => setValue(target.value)}>
            {values.map((varValue, index) => <option key={index} value={varValue}>{valueLiterals[index]}</option>)}
        </Dropdown>}
        {
            !values && (
                <Input
                    className={isBlank(condition.value) ? "invalid" : ""}
                    size={6}
                    type="text"
                    value={condition.value}
                    onChange={({ target }) => (!isNaN(Number(target.value)) || target.value.startsWith("%")) && condition.setValue(target.value)}
                />
            )
        }
        {unit}
    </>);
});

interface ConditionActionDetailsProps {
    condition: ConditionModel;
}

export const ConditionActionDetails: React.FunctionComponent<ConditionActionDetailsProps> = observer(({ condition }) => {
    return (
        <>
            <ElementGroup>
                <ActionParameterSelectConditionType condition={condition} /><br />
            </ElementGroup>
            <ElementGroup>
                <ActionParameterSelectVariable condition={condition} />
                &nbsp;
                <ActionParameterSelectOperator condition={condition} />
                &nbsp;
                <ActionParameterSelectVariableValue condition={condition} />
            </ElementGroup>
        </>
    );
});