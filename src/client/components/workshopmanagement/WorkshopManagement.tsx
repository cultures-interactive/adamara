import { observer } from "mobx-react-lite";
import React, { Component, ReactNode } from "react";
import styled from "styled-components";
import { MenuCard } from "../menu/MenuCard";
import { UiConstants } from "../../data/UiConstants";
import { WorkshopListView } from "./ManagementListView";
import { LogoutButton } from "../auth/LogoutButton";
import { userStore } from "../../stores/UserStore";
import { managementStore } from "../../stores/ManagementStore";
import { WorkshopDetailView } from "./WorkshopDetailView";
import { useTranslation } from "react-i18next";
import { openProductionEditor } from "./WorkshopHelper";
import { useHistory } from "react-router";
import { EditorNotifications } from "../editor/EditorNotifications";
import { managementClient } from "../../communication/ManagementClient";
import { LanguageSwitcher } from "../editor/LanguageSwitcher";
import { BsTranslate } from "react-icons/bs";
import { routes } from "../../data/routes";
import { NavigateTo } from "../shared/NavigateTo";
import { LoadingHeaderRightManagement } from "../editor/Header";

const ManagementWindow = styled.div`
    display: grid;
    grid-template-columns: 0.7fr 3fr;
    max-width: 870px;
    height: 99vh;
`;

const MainMenuWindow = styled(MenuCard)`
    grid-column-start: 1;
    display: grid;
    grid-template-rows: auto auto 1fr auto ;
    row-gap: 5px;

    background: ${UiConstants.COLOR_MENU_BACKGROUND};
`;

const ContentWindow = styled(MenuCard)`
    grid-column-start: 2;
`;

const ButtonGroup = styled.div`
    grid-auto-rows: 40px;
    display: grid;
    row-gap: 5px;
`;

class ManagementClientConnector extends Component {
    public componentDidMount(): void {
        managementClient.connectManagement();
    }

    public componentWillUnmount(): void {
        managementClient.disconnect();
    }

    public render(): ReactNode {
        return null;
    }
}

export const WorkshopManagement: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const history = useHistory();

    if (!userStore.isLoggedIn) {
        return <NavigateTo to={routes.home} />;
    }

    return (
        <>
            <ManagementClientConnector />
            <EditorNotifications
                isConnectedAndReadyCallback={() => managementStore.isConnectedAndReady}
                AdditionalConnectionStatusDisplay={() => null}
                LoadingHeader={LoadingHeaderRightManagement}
            />

            {/* <UndoRedoSlideMenu /> */}

            {managementStore.isInitialized &&
                <ManagementWindow>
                    <MainMenuWindow>
                        <div><BsTranslate /> {t("editor.language")}</div>
                        <ButtonGroup>
                            <LanguageSwitcher />
                        </ButtonGroup>
                        <div>{/* Padding */}</div>
                        <ButtonGroup>
                            {userStore.mayOpenMainGameEditor && (
                                <button onClick={() => openProductionEditor(history)}>{t("management.open_editor")}</button>
                            )}
                            <LogoutButton />
                        </ButtonGroup>
                    </MainMenuWindow>
                    {userStore.mayEditAllWorkshops && (
                        <ContentWindow>
                            <WorkshopListView />
                        </ContentWindow>
                    )}
                    {!userStore.mayEditAllWorkshops && (
                        <ContentWindow>
                            {managementStore.sessionWorkshop && (
                                <WorkshopDetailView editItem={managementStore.sessionWorkshop?.$modelId} />
                            )}
                            {!managementStore.sessionWorkshop && (
                                <div>{t("editor.error_workshop_does_not_exist")}</div>
                            )}
                        </ContentWindow>
                    )}
                </ManagementWindow>}
            {!managementStore.isInitialized && <>
                <div>{t("management.loading_message")}</div>
                <LogoutButton></LogoutButton>
            </>}
        </>
    );
});