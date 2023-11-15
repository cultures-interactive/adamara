import React from 'react';
import { useTranslation } from 'react-i18next';
import { authLogout } from '../../communication/api';
import { wait } from '../../../shared/helper/generalHelpers';
import { editorClient } from '../../communication/EditorClient';
import { userStore } from '../../stores/UserStore';
import { errorStore } from '../../stores/ErrorStore';
import { managementClient } from '../../communication/ManagementClient';

export async function logOut() {
    userStore.setRestartingAfterLoggingOut();
    editorClient.disconnect();
    managementClient.disconnect();

    while (true) {
        try {
            await authLogout();

            // For now, reload the page to prevent currently loading data from messing up the state
            // Once editorClient can properly disconnect,
            // "userStore.setLoggedOut(LogoutReason.UserRequested);"
            // should be called here instead
            window.location.reload();
            return;
        } catch (e) {
            errorStore.addErrorFromAxiosErrorObject(e);
        }

        await wait(1000);
    }
}

export const LogoutButton: React.FunctionComponent = () => {
    const { t } = useTranslation();

    return (
        <button onClick={logOut}>{t("editor.auth_log_out")}</button>
    );
};
