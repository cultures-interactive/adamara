import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { ReceiveTaskActionModel } from '../../../../shared/action/ActionModel';
import { DisplayMode, TranslatedStringActionDetail } from './components/TranslatedStringActionDetail';
import { TranslatedString } from '../../../../shared/game/TranslatedString';
import { ActionEditorChangeGroup, groupUndoableActionEditorChanges } from '../../../stores/undo/operation/ActionEditorSubmitChangesOp';
import { QuestSelectionDetail } from './components/QuestSelectionDetail';
import { Dropdown } from '../../editor/Dropdown';
import { isBlank } from "../../../../shared/helper/generalHelpers";
import { ActionTreeModel } from '../../../../shared/action/ActionTreeModel';
import { getActionShortDescriptionForActionEditor } from '../../../helper/actionEditorHelpers';
import { ElementGroup } from './components/BaseElements';
import { actionEditorStore } from '../../../stores/ActionEditorStore';

interface QuestOrTaskActionDetailProps {
    parentTree: ActionTreeModel;
    questId: string;
    questIdSetter: (value: string) => void;
    taskId?: string;
    taskIdSetter?: (value: string) => void;
    text: TranslatedString;
}

export const QuestOrTaskActionDetail: React.FunctionComponent<QuestOrTaskActionDetailProps> = observer(({ parentTree, questId, questIdSetter, taskId, taskIdSetter, text }) => {
    const { t } = useTranslation();

    const { currentRootActionTree } = actionEditorStore;

    const tasks = !taskIdSetter ? null : currentRootActionTree.tasks(questId);

    const setQuestAndResetTask = (questId: string) => {
        groupUndoableActionEditorChanges(ActionEditorChangeGroup.UnspecificGroupedNodeChanges, () => {
            questIdSetter(questId);
            if (taskIdSetter)
                taskIdSetter("");
        });
    };

    return (
        <div>
            <QuestSelectionDetail
                parentTree={parentTree}
                name={t(tasks ? "action_editor.property_task" : "action_editor.property_quest")}
                questId={questId}
                questIdSetter={setQuestAndResetTask}
            />
            {
                tasks && (
                    <ElementGroup>
                        <Dropdown
                            className={isBlank(taskId) ? "invalid" : ""}
                            value={taskId}
                            onChange={({ target }) => taskIdSetter(target.value)}
                        >
                            <option value=""></option>
                            {[...tasks].map(task => <option key={task.$modelId} value={task.$modelId}>{getActionShortDescriptionForActionEditor(task, t)}</option>)}
                        </Dropdown>
                    </ElementGroup>
                )
            }
            <TranslatedStringActionDetail name={t("action_editor.property_description")} translatedString={text} displayMode={DisplayMode.CommentAndGenders} allowBlankValue={false} />
        </div>
    );
});