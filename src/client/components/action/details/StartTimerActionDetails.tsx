import React from 'react';
import { observer } from "mobx-react-lite";
import { StartTimerActionModel } from '../../../../shared/action/ActionModel';
import { NumberActionDetail } from './components/NumberActionDetail';
import { BooleanActionDetail } from './components/BooleanActionDetail';
import { DisplayMode, TranslatedStringActionDetail } from './components/TranslatedStringActionDetail';
import { useTranslation } from 'react-i18next';

interface StartTimerActionDetailsProps {
    action: StartTimerActionModel;
}

export const StartTimerActionDetails: React.FunctionComponent<StartTimerActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <>
            <NumberActionDetail name={t("action_editor.property_time")} value={action.time} valueSetter={action.setTime.bind(action)} />
            <BooleanActionDetail name={t("action_editor.property_visible")} checked={action.visible} toggle={action.toggleVisible.bind(action)} />
            {action.visible && <BooleanActionDetail name={t("action_editor.property_count_down")} checked={action.countDown} toggle={action.toggleCountDown.bind(action)} />}
            {action.visible && <TranslatedStringActionDetail name={t("action_editor.property_text_neutral")} translatedString={action.text} displayMode={DisplayMode.CommentAndGenders} allowBlankValue={true} />}
        </>
    );
});
