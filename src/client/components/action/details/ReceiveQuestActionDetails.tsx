import React from 'react';
import { observer } from "mobx-react-lite";
import { ReceiveQuestActionModel } from '../../../../shared/action/ActionModel';
import { StringActionDetail } from './components/StringActionDetail';
import { DisplayMode, TranslatedStringActionDetail } from './components/TranslatedStringActionDetail';
import { BooleanActionDetail } from './components/BooleanActionDetail';
import { editorStore } from '../../../stores/EditorStore';
import { useTranslation } from 'react-i18next';

interface ReceiveQuestActionDetailsActionDetailsProps {
    action: ReceiveQuestActionModel;
}

export const ReceiveQuestActionDetails: React.FunctionComponent<ReceiveQuestActionDetailsActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return <>
        <StringActionDetail name={t("action_editor.property_quest_id")} value={action.questId} valueSetter={action.setQuestId.bind(action)} allowBlankValue={false} />
        <TranslatedStringActionDetail name={t("action_editor.property_description")} translatedString={action.description} displayMode={DisplayMode.CommentAndGenders} allowBlankValue={false} />
        {editorStore.isMainGameEditor && <BooleanActionDetail name={t("action_editor.property_scope_global")} checked={action.global} toggle={action.toggleGlobal.bind(action)} />}
    </>;
});