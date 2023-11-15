import React, { Fragment } from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { StartDialogueActionModel } from '../../../../shared/action/ActionModel';
import { SelectableExitModel } from '../../../../shared/action/SelectableExitModel';
import styled from 'styled-components';
import { IoMdHelpCircle } from 'react-icons/io';
import { ConditionActionDetails } from './ConditionActionDetails';
import { DisplayMode, TranslatedStringActionDetail } from './components/TranslatedStringActionDetail';
import { NPCActionDetail } from './components/NPCSelectionActionDetail';
import { FaMinusCircle, FaPlusCircle } from 'react-icons/fa';
import { ActionEditorChangeGroup, groupUndoableActionEditorChanges } from '../../../stores/undo/operation/ActionEditorSubmitChangesOp';
import { TextFormatInfoPopup } from "../TextFormatInfoPopup";
import { getTreeParent } from '../../../../shared/action/ActionTreeModel';
import { ElementGroup, ElementGroupContainer } from './components/BaseElements';
import { BooleanActionDetail } from './components/BooleanActionDetail';

const DeleteButton = styled.button`
    float: right;
    color: #DD0000;
    font-size: 10px;
    border: 0;
`;

const FormattingHelpButtonContainer = styled.div`
    float: right;
    margin-right: 8px;
`;

const HelpIcon = styled(IoMdHelpCircle)`
    vertical-align: bottom;
    font-size: 18px;
`;

interface DialogueAnswerProps {
    index: number;
    exit: SelectableExitModel;
    remove: () => void;
}

const DialogueAnswer: React.FunctionComponent<DialogueAnswerProps> = observer(({ index, exit, remove }) => {
    const { t } = useTranslation();
    return (
        <ElementGroupContainer>
            <DeleteButton onClick={remove}><FaMinusCircle /></DeleteButton>
            <TranslatedStringActionDetail name={(index + 1) + ". " + t("action_editor.property_answer")} translatedString={exit.value} displayMode={DisplayMode.CommentAndGenders} allowBlankValue={false} />
            <BooleanActionDetail name={t("action_editor.hide_condition")} checked={Boolean(exit.hideCondition)} toggle={exit.toggleHideConditionActive.bind(exit)} />
            {exit.hideCondition && <ConditionActionDetails condition={exit.hideCondition} />}
        </ElementGroupContainer>
    );
});

interface StartDialogueActionDetailsProps {
    action: StartDialogueActionModel;
}

export const StartDialogueActionDetails: React.FunctionComponent<StartDialogueActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();
    return (
        <>
            <FormattingHelpButtonContainer>
                <TextFormatInfoPopup showTextStyleOptions={true} />
            </FormattingHelpButtonContainer>

            <NPCActionDetail
                name={t("action_editor.property_speaker")}
                selectedNPC={action.speaker}
                npcSetter={action.setSpeaker.bind(action)}
                allowBlankValue={true}
                parentTree={getTreeParent(action)}
            />

            {(action.speaker && (typeof (action.speaker) === "string")) && (
                <div><i>Vorheriger Sprecher-Name: {action.speaker}</i></div>
            )}

            <TranslatedStringActionDetail
                name={t("action_editor.property_text_neutral")}
                translatedString={action.text}
                displayMode={DisplayMode.CommentAndGenders}
                allowBlankValue={false}
            />

            {action.answers.map((answer, index) => (
                <Fragment key={index}>
                    <DialogueAnswer
                        index={index}
                        exit={answer}
                        remove={() => groupUndoableActionEditorChanges(ActionEditorChangeGroup.UnspecificGroupedNodeChanges, () => action.removeAnswer(index))}
                    />
                </Fragment>
            ))}

            <ElementGroup>
                <button onClick={action.addAnswer.bind(action)}><FaPlusCircle /> {t("action_editor.property_answer")}</button>
            </ElementGroup>
        </>
    );
});
