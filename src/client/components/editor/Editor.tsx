import React from 'react';
import { EditorClientConnector } from './EditorClientConnector';
import { EditorNotificationsEditorAndGame } from './EditorNotifications';
import { MapEditor } from '../mapEditor/MapEditor';
import { Route, Switch } from 'react-router-dom'; // Pages
import { routes } from '../../data/routes';
import { EditorGame } from '../game/EditorGame';
import { TileAssetEditor } from '../tileAssets/TileAssetEditor';
import { CombatConfigurator } from '../combat/CombatConfigurator';
import { ActionEditor } from '../action/ActionEditor';
import { AnimationEditor } from "../animations/AnimationEditor";
import { EditorPopupWindows } from './EditorPopupWindows';
import { observer } from 'mobx-react-lite';
import { Header } from './Header';
import { LoginForm } from '../auth/LoginForm';
import { localSettingsStore } from '../../stores/LocalSettingsStore';
import { userStore } from '../../stores/UserStore';
import { TranslationManagement } from '../translation/TranslationManagement';
import { editorStore } from '../../stores/EditorStore';
import { NavigateTo } from '../shared/NavigateTo';

export const Editor: React.FunctionComponent = observer(() => {
    if (!userStore.mayAccessEditor)
        return <LoginForm />;

    if (editorStore.startedInitialization && !editorStore.sessionModule && !userStore.mayOpenMainGameEditor) {
        if (userStore.mayUseWorkshopManagementView) {
            return <NavigateTo to={routes.workshopManagement} />;
        } else {
            return <LoginForm />;
        }
    }

    const { isProductionEditor } = localSettingsStore;

    return (
        <>
            <EditorClientConnector />
            <EditorPopupWindows />
            <EditorNotificationsEditorAndGame />

            <Header />

            <Switch>
                {isProductionEditor && <Route path={routes.editorCombat} component={CombatConfigurator} />}
                {isProductionEditor && <Route path={routes.editorTileAssets} component={TileAssetEditor} />}
                {isProductionEditor && <Route path={routes.editorAnimations} component={AnimationEditor} />}
                <Route path={routes.editorMap} component={MapEditor} />
                <Route path={routes.editorGame} component={EditorGame} />
                <Route path={routes.translationManagement} component={TranslationManagement} />
                <Route>
                    <ActionEditor />
                </Route>
            </Switch>
        </>
    );
});
