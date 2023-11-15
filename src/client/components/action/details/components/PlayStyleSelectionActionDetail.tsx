import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { playStyles } from '../../../../../shared/action/ActionModel';
import { Dropdown } from "../../../editor/Dropdown";
import { formatTreeParameter } from "../../../../../shared/helper/actionTreeHelper";
import { isBlank } from "../../../../../shared/helper/generalHelpers";
import { ActionTreeModel } from '../../../../../shared/action/ActionTreeModel';
import { ElementGroup, ElementLabel } from './BaseElements';

interface PlayStyleSelectionActionDetailProps {
    parentTree: ActionTreeModel;
    name: string;
    value: string;
    valueSetter: (value: string) => void;
    allowBlankValue?: boolean;
}

export const PlayStyleSelectionActionDetail: React.FunctionComponent<PlayStyleSelectionActionDetailProps> = observer(({ parentTree, name, value, valueSetter, allowBlankValue }) => {
    const { t } = useTranslation();

    const parameters = parentTree.treeParameterActions("actions/PlayStyleValueModel").map(p => formatTreeParameter(p.name));
    const options = ["", ...playStyles, ...parameters];
    const optionsLiterals = ["", ...playStyles.map(f => t("content.play_style_" + f)), ...parameters];
    return (
        <ElementGroup>
            <ElementLabel>{name}</ElementLabel>
            <Dropdown className={(!allowBlankValue && isBlank(value)) ? "invalid" : ""}
                value={value} onChange={({ target }) => valueSetter(target.value)}
            >
                {options.map((o, index) => <option key={o} value={o}>{optionsLiterals[index]}</option>)}
            </Dropdown>
        </ElementGroup>
    );
});
