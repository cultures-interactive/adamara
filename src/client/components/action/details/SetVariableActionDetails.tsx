import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { ActionScope, SetVariableActionModel } from '../../../../shared/action/ActionModel';
import { StringActionDetail } from './components/StringActionDetail';
import { ScopeSelectionActionDetail } from './components/ScopeSelectionActionDetail';
import { Dropdown } from "../../editor/Dropdown";
import { isBlank } from "../../../../shared/helper/generalHelpers";
import { sharedStore } from '../../../stores/SharedStore';
import { getTreeParent } from '../../../../shared/action/ActionTreeModel';
import { editorStore } from '../../../stores/EditorStore';
import { ElementGroup, ElementLabel } from './components/BaseElements';

interface SetVariableActionProps {
    action: SetVariableActionModel;
}

const ActionParameterSelectVariable: React.FunctionComponent<SetVariableActionProps> = observer(({ action }) => {
    const { t } = useTranslation();
    const tree = action.scope === ActionScope.Tree ? getTreeParent(action) : sharedStore.mainGameRootActionTree;
    const variablesInTree = [...tree.variableNames(action.scope)];
    return (
        <ElementGroup>
            <ElementLabel>{t("action_editor.property_variable_existing")}</ElementLabel>
            <Dropdown
                className={isBlank(action.name) ? "invalid" : ""}
                value={action.name}
                onChange={({ target }) => action.setName(target.value)}
            >
                {variablesInTree.map(variableName => <option key={variableName} value={variableName}>{variableName}</option>)}
            </Dropdown>
        </ElementGroup>
    );
});

interface SetVariableActionDetailsProps {
    action: SetVariableActionModel;
}

export const SetVariableActionDetails: React.FunctionComponent<SetVariableActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <>
            {editorStore.isMainGameEditor && <ScopeSelectionActionDetail scope={action.scope} scopeSetter={action.setScope.bind(action)} />}
            <StringActionDetail name={t("action_editor.new_variable")} value={action.name} valueSetter={action.setName.bind(action)} allowBlankValue={false} />
            <ActionParameterSelectVariable action={action} />
            <StringActionDetail name={t("action_editor.property_value")} value={action.value} valueSetter={action.setValue.bind(action)} allowBlankValue={false} />
        </>
    );
});