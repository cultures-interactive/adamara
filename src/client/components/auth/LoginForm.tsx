import React, { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { EditorNotificationsErrorsWithWithContainer } from '../editor/EditorNotifications';
import { observer } from 'mobx-react-lite';
import { authLogin } from '../../communication/api';
import { ErrorType } from '../../stores/editor/ErrorNotification';
import { CenterContainer, Overlay, PopupWindow } from '../shared/PopupComponents';
import { userStore } from '../../stores/UserStore';
import { errorStore } from '../../stores/ErrorStore';
import { useHistory } from 'react-router';
import { navigateTo } from '../../helper/navigationHelpers';
import { routes } from '../../data/routes';
import { Heading1Base } from '../shared/Heading';
import { AdamaraLogo } from '../shared/AdamaraLogo';
import { tryToTranslateAxiosError } from '../../helper/errorHelpers';
import { Link } from 'react-router-dom';
import { FloatingLanguageSwitcher } from '../editor/FloatingLanguageSwitcher';

const Form = styled.form`
    text-align: center;
    * {
        margin-top: 0.4em;
    }
`;

const Center = styled.div`
    text-align: center;
`;

export const LoginForm: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const [accessCode, setAccessCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const history = useHistory();

    async function onSubmit(e: FormEvent) {
        e.preventDefault();

        if (isSubmitting)
            return;

        setIsSubmitting(true);

        try {
            const authPrivilege = (await authLogin("-", accessCode)).user.privilegeLevel;
            userStore.setLoggedIn(authPrivilege);
            if (userStore.isWorkshopPlayer) {
                navigateTo(history, routes.playCode);
            } else if (userStore.isWorkshopParticipant) {
                navigateTo(history, routes.editorAction);
            }
        } catch (e) {
            if (e.response?.status === 401) {
                errorStore.addError(ErrorType.General, "editor.auth_login_fail");
            } else {
                errorStore.addErrorFromErrorObject(tryToTranslateAxiosError(e));
            }
            setAccessCode("");
            setIsSubmitting(false);
        }
    }

    return (
        <Overlay>
            <CenterContainer>
                <PopupWindow>
                    <AdamaraLogo />
                    <Form onSubmit={onSubmit}>
                        <Heading1Base>{t("editor.auth_login_title")}</Heading1Base>
                        <div><input disabled={isSubmitting} type="password" value={accessCode} onChange={e => setAccessCode(e.target.value)} autoFocus={true} /></div>
                        <input disabled={isSubmitting || !accessCode} type="submit" value={t("editor.auth_submit") as string} />
                        {errorStore.hasErrors && (
                            <Overlay>
                                <EditorNotificationsErrorsWithWithContainer />
                            </Overlay>
                        )}
                    </Form>
                    <hr />
                    <Center>
                        <Link to={routes.publicMenu}>{t("editor.play_game")}</Link>
                    </Center>
                </PopupWindow>
            </CenterContainer>
            <FloatingLanguageSwitcher />
        </Overlay>
    );
});
