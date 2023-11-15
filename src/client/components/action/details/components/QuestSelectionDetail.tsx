import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { formatTreeParameter } from "../../../../../shared/helper/actionTreeHelper";
import { Dropdown } from '../../../editor/Dropdown';
import { isBlank } from "../../../../../shared/helper/generalHelpers";
import { actionEditorStore } from '../../../../stores/ActionEditorStore';
import { sharedStore } from '../../../../stores/SharedStore';
import { ActionTreeModel } from '../../../../../shared/action/ActionTreeModel';
import { getActionShortDescriptionForActionEditor } from '../../../../helper/actionEditorHelpers';
import { ElementGroup, ElementLabel } from './BaseElements';

interface QuestSelectionDetailProps {
    parentTree: ActionTreeModel;
    name: string;
    questId: string;
    questIdSetter: (value: string) => void;
    allowBlankValue?: boolean;
}

export const QuestSelectionDetail: React.FunctionComponent<QuestSelectionDetailProps> = observer(({ parentTree, name, questId, questIdSetter, allowBlankValue }) => {
    const { t } = useTranslation();
    const { currentRootActionTree } = actionEditorStore;

    const quests = [...parentTree.quests(currentRootActionTree)];
    const parameters = parentTree.treeParameterActions("actions/QuestIdValueModel").map(p => formatTreeParameter(p.name));
    const options = ["", ...quests.map(q => q.$modelId), ...parameters];
    const optionsLiterals = ["", ...quests.map(q => getActionShortDescriptionForActionEditor(q, t)), ...parameters];
    return (
        <ElementGroup>
            <ElementLabel>{name}</ElementLabel>
            <Dropdown
                className={(!allowBlankValue && isBlank(questId)) ? "invalid" : ""}
                value={questId}
                onChange={({ target }) => questIdSetter(target.value)}
            >
                {options.map((o, index) => <option key={o} value={o}>{optionsLiterals[index]}</option>)}
            </Dropdown><br />
        </ElementGroup>
    );
});