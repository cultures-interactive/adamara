import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { SetPlayStyleActionModel } from '../../../../shared/action/ActionModel';
import { PlayStyleSelectionActionDetail } from './components/PlayStyleSelectionActionDetail';
import { getTreeParent } from '../../../../shared/action/ActionTreeModel';

interface SetPlayStyleActionDetailsProps {
    action: SetPlayStyleActionModel;
}

export const SetPlayStyleActionDetails: React.FunctionComponent<SetPlayStyleActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    const parentTree = getTreeParent(action);

    return (
        <>
            <PlayStyleSelectionActionDetail name={t("action_editor.property_play_style")} value={action.playStyle} valueSetter={action.setPlayStyle.bind(action)} parentTree={parentTree} />
        </>
    );
});
