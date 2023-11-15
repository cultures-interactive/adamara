import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { ReceiveReputationActionModel, reputationAmounts } from '../../../../shared/action/ActionModel';
import { FactionSelectionActionDetail } from './components/FactionSelectionActionDetail';
import { Dropdown } from "../../editor/Dropdown";
import { getTreeParent } from '../../../../shared/action/ActionTreeModel';
import { ElementGroup, ElementLabel } from './components/BaseElements';

interface ReceiveReputationActionDetailsProps {
    action: ReceiveReputationActionModel;
}

export const ReceiveReputationActionDetails: React.FunctionComponent<ReceiveReputationActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    const parentTree = getTreeParent(action);

    return (
        <>
            <FactionSelectionActionDetail name={t("action_editor.property_faction")} value={action.fraction} valueSetter={action.setFraction.bind(action)} parentTree={parentTree} />
            <ElementGroup>
                <ElementLabel>{t("action_editor.property_amount")}</ElementLabel>
                <Dropdown
                    value={action.amount}
                    onChange={({ target }) => action.setAmount(target.value)}
                >
                    {reputationAmounts.map(amount => <option key={amount} value={amount}>{t("content.reputation_amount_" + amount)}</option>)}
                </Dropdown>
            </ElementGroup>
        </>
    );
});
