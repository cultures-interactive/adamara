import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { StartActActionModel } from '../../../../shared/action/ActionModel';
import { Dropdown } from "../../editor/Dropdown";
import { ElementGroup, ElementLabel } from './components/BaseElements';

interface StartActActionDetailsProps {
    action: StartActActionModel;
}

export const StartActActionDetails: React.FunctionComponent<StartActActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <ElementGroup>
            <ElementLabel>{t("action_editor.property_act")}</ElementLabel>
            <Dropdown
                value={action.act}
                onChange={({ target }) => action.setAct(target.value)}
            >
                {[2, 3, 4, 5].map(amount => <option key={amount} value={amount}>{amount}</option>)}
            </Dropdown>
        </ElementGroup>
    );
});