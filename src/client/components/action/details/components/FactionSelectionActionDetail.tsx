import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { factions } from '../../../../../shared/action/ActionModel';
import { formatTreeParameter } from "../../../../../shared/helper/actionTreeHelper";
import { Dropdown } from "../../../editor/Dropdown";
import { isBlank } from "../../../../../shared/helper/generalHelpers";
import { ActionTreeModel } from '../../../../../shared/action/ActionTreeModel';
import { ElementGroup, ElementLabel } from './BaseElements';

interface FactionSelectionActionDetailProps {
    parentTree: ActionTreeModel;
    name: string;
    value: string;
    valueSetter: (value: string) => void;
    allowBlankValue?: boolean;
}

export const FactionSelectionActionDetail: React.FunctionComponent<FactionSelectionActionDetailProps> = observer(({ parentTree, name, value, valueSetter, allowBlankValue }) => {
    const { t } = useTranslation();

    const parameters = parentTree.treeParameterActions("actions/FactionValueModel").map(p => formatTreeParameter(p.name));
    const options = ["", ...factions, ...parameters];
    const optionsLiterals = ["", ...factions.map(f => t("content.faction_" + f)), ...parameters];
    return (
        <ElementGroup>
            <ElementLabel>{name}</ElementLabel>
            <Dropdown
                className={(!allowBlankValue && isBlank(value)) ? "invalid" : ""}
                value={value}
                onChange={({ target }) => valueSetter(target.value)}
            >
                {options.map((o, index) => <option key={o} value={o}>{optionsLiterals[index]}</option>)}
            </Dropdown>
        </ElementGroup>
    );
});
