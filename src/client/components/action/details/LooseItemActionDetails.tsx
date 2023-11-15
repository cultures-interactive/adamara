import React from 'react';
import { observer } from "mobx-react-lite";
import { ItemSelectionActionDetail } from './components/ItemSelectionActionDetail';
import { ItemSelectionMode, LooseItemActionModel } from '../../../../shared/action/ActionModel';
import { BooleanActionDetail } from './components/BooleanActionDetail';
import { getTreeParent } from '../../../../shared/action/ActionTreeModel';
import { useTranslation } from 'react-i18next';

interface LooseItemActionDetailsProps {
    action: LooseItemActionModel;
}

export const LooseItemActionDetails: React.FunctionComponent<LooseItemActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <>
            <ItemSelectionActionDetail
                parentTree={getTreeParent(action)}
                itemIdOrTags={action.itemId}
                itemIdOrTagsSetter={action.setItemId.bind(action)}
                selectionMode={action.selectionMode}
                selectionModeSetter={action.setSelectionMode.bind(action)}
            />
            {action.selectionMode !== ItemSelectionMode.Item && <>
                <BooleanActionDetail name={t("action_editor.property_item_lose_all")} checked={action.allItems} toggle={action.toggleAllItems.bind(action)} />
            </>}
        </>
    );
});