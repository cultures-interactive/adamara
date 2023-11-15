import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CenterContainer, Overlay, PopupWindow } from '../shared/PopupComponents';
import { routes } from '../../data/routes';
import { AdamaraLogo } from '../shared/AdamaraLogo';
import { Link } from 'react-router-dom';
import { PlayableModule } from '../../../shared/workshop/ModuleModel';
import { resourcePublicModuleInMenu } from '../../communication/api';
import { PublicMenuModuleSelection } from './PublicMenuModuleSelection';
import { LoadingSpinnerBlack } from '../shared/LoadingSpinner';
import { FloatingLanguageSwitcher } from '../editor/FloatingLanguageSwitcher';

const Center = styled.div`
    text-align: center;
`;

const ErrorText = styled.div`
    color: red;
`;

const StyledPopupWindow = styled(PopupWindow)`
    min-width: min(95%, 750px);
`;

export const PublicMenu: React.FunctionComponent = () => {
    const { t } = useTranslation();

    const [modules, setModules] = useState<PlayableModule[]>(null);
    const [error, setError] = useState<string>(null);

    useEffect(() => {
        resourcePublicModuleInMenu()
            .then(modules => setModules(modules))
            .catch(error => setError(error.toString()));
    }, []);

    if (!modules && !error) {
        return (
            <Overlay>
                <CenterContainer>
                    <LoadingSpinnerBlack />
                </CenterContainer>
                <FloatingLanguageSwitcher />
            </Overlay>
        );
    }

    return (
        <Overlay>
            <CenterContainer>
                <StyledPopupWindow>
                    <Center>
                        <AdamaraLogo />
                    </Center>
                    {error && <ErrorText>{error}</ErrorText>}
                    {modules && <PublicMenuModuleSelection modules={modules} />}
                    <hr />
                    <Center>
                        <Link to={routes.home}>{t("editor.go_to_editor")}</Link>
                    </Center>
                </StyledPopupWindow>
            </CenterContainer>
            <FloatingLanguageSwitcher />
        </Overlay>
    );
};
