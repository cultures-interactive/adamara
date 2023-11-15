import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { ActionScope } from '../../../../../shared/action/ActionModel';
import { ElementGroup, ElementLabel } from './BaseElements';

interface ScopeSelectionActionDetailProps {
    scope: ActionScope;
    scopeSetter: (value: ActionScope) => void;
}

export const ScopeSelectionActionDetail: React.FunctionComponent<ScopeSelectionActionDetailProps> = observer(({ scope, scopeSetter }) => {
    const { t } = useTranslation();
    return (
        <ElementGroup>
            <ElementLabel>{t("action_editor.property_scope")}</ElementLabel>
            <select value={scope} onChange={({ target }) => scopeSetter(parseInt(target.value))}>
                <option value={ActionScope.Tree}>{t("action_editor.property_scope_tree")}</option>)
                <option value={ActionScope.Global}>{t("action_editor.property_scope_global")}</option>)
            </select>
        </ElementGroup>
    );

});