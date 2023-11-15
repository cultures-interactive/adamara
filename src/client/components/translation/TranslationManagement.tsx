import React from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { sharedStore } from '../../stores/SharedStore';
import { Route, Switch } from 'react-router';
import { routes } from '../../data/routes';
import { TranslationExport } from './TranslationExport';
import { TranslationImport } from './TranslationImport';
import { UndoableNavLink } from '../editor/Header';
import { useTranslation } from 'react-i18next';
import { TranslationStats } from './TranslationStats';
import { MakeshiftTranslationSystemDataDisplay } from './MakeshiftTranslationSystemDataDisplay';

const Container = styled.div`
    padding: 1em;
    padding-top: 2em;
    user-select: text;
`;

export const TranslationManagement: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    if (!sharedStore.isInitialized)
        return null;

    return (
        <Container>
            <br />
            <div>
                <UndoableNavLink to={routes.translationManagementExport}>{t("translation.export")}</UndoableNavLink>
                <UndoableNavLink to={routes.translationManagementImport}>{t("translation.import")}</UndoableNavLink>
                <UndoableNavLink to={routes.translationManagementStats}>{t("translation.stats")}</UndoableNavLink>
                <UndoableNavLink to={routes.translationManagementMakeshiftTranslationSystem}>{t("translation.makeshift_translation_system")}</UndoableNavLink>
            </div>
            <br />
            <Switch>
                <Route path={routes.translationManagementExport} component={TranslationExport} />
                <Route path={routes.translationManagementImport} component={TranslationImport} />
                <Route path={routes.translationManagementStats} component={TranslationStats} />
                <Route path={routes.translationManagementMakeshiftTranslationSystem} component={MakeshiftTranslationSystemDataDisplay} />
            </Switch>
        </Container>
    );
});