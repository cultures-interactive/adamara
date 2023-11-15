import { hot } from 'react-hot-loader/root';
import "normalize.css";
import { Editor } from './editor/Editor';
import styled, { createGlobalStyle } from 'styled-components';
import React, { useEffect } from "react";
import Modal from 'react-modal';
import { Route, Switch, useLocation } from 'react-router';
import { routes } from '../data/routes';
import { observer } from 'mobx-react-lite';
import { RestartingAfterLoggingOutNotification } from './auth/RestartingAfterLoggingOutNotification';
import { MainGameRoute } from './game/MainGameRoute';
import { userStore } from '../stores/UserStore';
import { WorkshopManagement } from './workshopmanagement/WorkshopManagement';
import { PlayCodeRoute } from './game/PlayCodeRoute';
import { NavigateTo } from './shared/NavigateTo';
import { PublicMenu } from './publicMenu/PublicMenu';

const GlobalStyle = createGlobalStyle`
    html {
        font-size: 16px;
        font-family: 'Nunito', sans-serif;
    }

    h1, h2, h3, h4, h5 {
        font-size: 16px;
    }

    ::backdrop
    {
        background-color: white;
    }

    /* https://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice */
    html {
        box-sizing: border-box;
    }
    
    *, *:before, *:after {
        box-sizing: inherit;
    }

    html,
    body {
        overscroll-behavior-y: contain;
        user-select: none;
    }
`;

const Container = styled.div`
    margin: 0.3em;
`;

const AppInner = observer(() => {
    const location = useLocation();

    if (userStore.restartingAfterLoggingOut)
        return <RestartingAfterLoggingOutNotification />;

    if ((location.pathname === routes.home) && userStore.mayUseWorkshopManagementView) {
        return <NavigateTo to={routes.workshopManagement} />;
    }

    return (
        <>
            <GlobalStyle />
            <Switch>
                <Route path={routes.mainGame} component={MainGameRoute} />
                <Route path={routes.publicGameVariant} component={MainGameRoute} />
                <Route path={routes.playCode} component={PlayCodeRoute} />
                <Route path={routes.workshopManagement} component={WorkshopManagement} />
                <Route path={routes.publicMenu} component={PublicMenu} />
                <Route>
                    <Editor />
                </Route>
            </Switch>
        </>
    );
});

const App = () => {
    useEffect(() => {
        // componentDidMount event
        Modal.setAppElement("#appRootContainer");
    }, []);

    return (
        <Container id="appRootContainer">
            <AppInner />
        </Container>
    );
};

export default hot(App);
