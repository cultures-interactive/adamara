import React from 'react';
import { observer } from "mobx-react-lite";
import { ActionScope, CalculateVariableActionModel, CalculateVariableOperator, calculateVariableOperatorLiterals } from '../../../../shared/action/ActionModel';
import { ScopeSelectionActionDetail } from './components/ScopeSelectionActionDetail';
import { isNumberVariableInScope } from './ConditionActionDetails';
import { Dropdown } from '../../editor/Dropdown';
import { isBlank } from "../../../../shared/helper/generalHelpers";
import { sharedStore } from '../../../stores/SharedStore';
import { Input } from '../../editor/Input';
import { ActionTreeModel, getTreeParent } from '../../../../shared/action/ActionTreeModel';
import { editorStore } from '../../../stores/EditorStore';
import { ElementGroup } from './components/BaseElements';

interface SelectVariableActionProps {
    parentTree: ActionTreeModel;
    variable: string;
    variableSetter: (value: string) => void;
}

const ActionParameterSelectVariable: React.FunctionComponent<SelectVariableActionProps> = observer(({ parentTree, variable, variableSetter }) => {
    const { mainGameRootActionTree } = sharedStore;
    const globalVariables = [...mainGameRootActionTree.variableNames(ActionScope.Global)].filter(v => isNumberVariableInScope(parentTree, v, ActionScope.Global));
    const localVariables = [...parentTree.variableNames(ActionScope.Tree)].filter(v => isNumberVariableInScope(parentTree, v, ActionScope.Tree));
    const allVariables = [...new Set([...localVariables, ...globalVariables])];
    return (
        <Dropdown
            className={isBlank(variable) ? "invalid" : ""}
            value={variable}
            onChange={({ target }) => variableSetter(target.value)}
        >
            {allVariables.map(variableName => <option key={variableName} value={variableName}>{variableName}</option>)}
        </Dropdown>
    );
});

interface CalculateVariableActionDetailsProps {
    action: CalculateVariableActionModel;
}

export const CalculateVariableActionDetails: React.FunctionComponent<CalculateVariableActionDetailsProps> = observer(({ action }) => {
    const parentTree = getTreeParent(action);

    return (
        <>
            {editorStore.isMainGameEditor && <ScopeSelectionActionDetail scope={action.scope} scopeSetter={action.setScope.bind(action)} />}
            <ElementGroup>
                <ActionParameterSelectVariable variable={action.variable1} variableSetter={action.setVariable1.bind(action)} parentTree={parentTree} />
                &nbsp;
                <Dropdown
                    value={action.operator}
                    onChange={({ target }) => action.setOperator(parseInt(target.value))}
                >
                    {
                        Object.keys(CalculateVariableOperator)
                            .filter(value => !Number.isNaN(Number(value)))
                            .map(op => <option key={op} value={op}>{calculateVariableOperatorLiterals[+op]}</option>)
                    }
                </Dropdown>
                &nbsp;
                <ActionParameterSelectVariable variable={action.variable2} variableSetter={action.setVariable2.bind(action)} parentTree={parentTree} />
                &nbsp;=&nbsp;
                <Input
                    className={isBlank(action.variableResult) ? "invalid" : ""}
                    type="text" value={action.variableResult}
                    onChange={({ target }) => action.setVariableResult(target.value)}
                />
            </ElementGroup>
        </>
    );
});