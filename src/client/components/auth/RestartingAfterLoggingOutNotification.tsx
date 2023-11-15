import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { errorStore } from '../../stores/ErrorStore';
import { EditorNotificationsErrorsWithWithContainer } from '../editor/EditorNotifications';
import { Overlay } from '../menu/PopupSubMenu';
import { CenterContainer, PopupWindow } from '../shared/PopupComponents';

export const RestartingAfterLoggingOutNotification: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    return (
        <Overlay>
            <CenterContainer>
                <PopupWindow>
                    {t("editor.auth_logging_out")}
                </PopupWindow>
            </CenterContainer>
            {errorStore.hasErrors && <EditorNotificationsErrorsWithWithContainer />}
        </Overlay>
    );
});
