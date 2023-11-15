import React from 'react';
import { observer } from "mobx-react-lite";
import { CopyAwarenessIntoVariableActionModel } from '../../../../shared/action/ActionModel';
import { StringActionDetail } from './components/StringActionDetail';
import { useTranslation } from 'react-i18next';

interface CopyAwarenessIntoVariableDetailsProps {
    action: CopyAwarenessIntoVariableActionModel;
}

export const CopyAwarenessIntoVariableDetails: React.FunctionComponent<CopyAwarenessIntoVariableDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <StringActionDetail name={t("action_editor.new_variable")} value={action.name} valueSetter={action.setName.bind(action)} allowBlankValue={false} />
    );
});