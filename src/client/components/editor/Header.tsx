import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { isMainGameRoute, routes } from '../../data/routes';
import { observer } from 'mobx-react-lite';
import { undoableSwitchMode } from '../../stores/undo/operation/SwitchModeOp';
import { UiConstants } from "../../data/UiConstants";
import { localSettingsStore } from '../../stores/LocalSettingsStore';
import { GiHamburgerMenu } from 'react-icons/gi';
import { BiArrowBack, BiPlayCircle } from 'react-icons/bi';
import { sharedStore } from '../../stores/SharedStore';
import { editorStore } from '../../stores/EditorStore';
import { userStore } from '../../stores/UserStore';
import { navigateTo } from '../../helper/navigationHelpers';
import { AiOutlineDatabase } from 'react-icons/ai';
import { SettingsMenu } from './SettingsMenu';
import { logOut } from '../auth/LogoutButton';
import { gameStore } from '../../stores/GameStore';

const debugServerColor: string = process.env.DEBUG_SERVER_COLOR;

const NavLinkContainer = styled.a`
    margin: 2px;
    padding-top: 2px;
    padding-bottom: 2px;
    padding-left: 6px;
    padding-right: 6px;
    border-radius: ${UiConstants.BORDER_RADIUS};
    background-color: ${UiConstants.COLOR_DARK_BUTTON};
    color: white;

    &:hover {
        cursor: pointer;
        background-color: ${UiConstants.COLOR_DARK_BUTTON_HOVER};
    }

    &.selected {
        padding-top: 0px;
        padding-bottom: 0px;
        background-color: ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
        border: 2px solid black;
    }

    text-decoration: none;
`;

const DropdownMenuContent = styled.div`
    display: none;
    position: absolute;
    background-color: #f9f9f9;
    min-width: 160px;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
    padding: 12px 16px;
    top: 0px;
    right: 0px;

    border-radius: ${UiConstants.BORDER_RADIUS};
`;

const DropdownMenuContainer = styled.div`
    position: relative;
    display: inline-block;
    padding-left: 7px;

    &:hover ${DropdownMenuContent} {
        display: block;
    }
`;

interface UndoableNavLinkProps {
    to: string;
    hideWhenSelected?: boolean;
}

export const UndoableNavLink: React.FunctionComponent<UndoableNavLinkProps> = ({ to, hideWhenSelected, children }) => {
    const history = useHistory();
    const location = useLocation();
    const isSelected = (location.pathname === to);
    if (hideWhenSelected && isSelected)
        return null;

    const className = isSelected ? "selected" : "";

    return (
        <NavLinkContainer
            href="#"
            className={className}
            onClick={(e) => {
                e.preventDefault();
                undoableSwitchMode(to, history);
            }}
            draggable={false}
        >
            {children}
        </NavLinkContainer>
    );
};

const BackToManagementViewLink: React.FunctionComponent = observer(() => {
    const history = useHistory();

    if (!userStore.mayUseWorkshopManagementView || isMainGameRoute())
        return null;

    return (
        <NavLinkContainer
            href="#"
            onClick={(e) => {
                e.preventDefault();
                gameStore.setDebugStartMarker(null, null);
                gameStore.setDebugStartNodeModelId(null);
                navigateTo(history, routes.workshopManagement);
            }}
            draggable={false}
        >
            <AiOutlineDatabase style={{ position: "relative", top: 2 }} />
        </NavLinkContainer>
    );
});

const HeaderContainer = styled.div`
    position: fixed;
    top: 0;

    padding: 3px;
    padding-top: 9px;
    height: 36px;

    box-shadow: 0 0 0.5em 0 #5555557f;
    border-top: none;

    background-color: ${debugServerColor ? debugServerColor : "white"};

    z-index: ${UiConstants.Z_INDEX_HEADER};
    overflow: unset;
`;

const borderRadius = "8px";

const HeaderLeftContainer = styled(HeaderContainer)`
    left: 0;
    border-left: none;
    border-radius: 0 0 ${borderRadius} 0;
`;

const HeaderRightContainer = styled(HeaderContainer)`
    right: 0;
    border-right: none;
    border-radius: 0 0 0 ${borderRadius};

    padding-top: 7px;
`;

export const Header: React.FunctionComponent = observer(() => {
    return (
        <>
            <HeaderLeftContainer>
                <HeaderLeft />
            </HeaderLeftContainer>

            {editorStore.isConnectedAndReady && (
                <HeaderRightContainer>
                    <HeaderRight />
                    <SettingsMenu
                        showNonGameSettings={true}
                    />
                </HeaderRightContainer>
            )}
        </>
    );
});

const BackIcon = styled(BiArrowBack)`
    position: absolute;
    top: 9px;
`;

const PlayIcon = styled(BiPlayCircle)`
    position: absolute;
    top: 9px;
`;

const TextAfterIcon = styled.span`
    margin-left: 14px;
`;

const HeaderLeft: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const location = useLocation();

    if (location.pathname == routes.editorGame) {
        return (
            <UndoableNavLink to={sharedStore.previousHistoryLocationPathname}><BackIcon /><TextAfterIcon /></UndoableNavLink>
        );
    }

    return (
        <>
            <UndoableNavLink to={routes.editorGame}><PlayIcon />&nbsp;<TextAfterIcon>{t("shared.headline_game")}</TextAfterIcon></UndoableNavLink>
            <UndoableNavLink to={routes.editorMap} hideWhenSelected={true}>{t("shared.headline_editor")}</UndoableNavLink>
            <UndoableNavLink to={routes.editorAction} hideWhenSelected={true}>{t("shared.headline_action_editor")}</UndoableNavLink>
        </>
    );
});

const HeaderRight: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const location = useLocation();

    const { isProductionEditor } = localSettingsStore;
    if (!isProductionEditor || !editorStore.isMainGameEditor) {
        if (location.pathname == routes.editorGame) {
            return null;
        } else {
            return (
                <>
                    <BackToManagementViewLink />
                </>
            );
        }
    }

    return (
        <>
            <DropdownMenuContainer>
                <GiHamburgerMenu style={{ position: "relative", top: 2 }} />
                <DropdownMenuContent>
                    <UndoableNavLink to={routes.editorCombat}>{t("shared.headline_combat_configurator")}</UndoableNavLink>
                    <UndoableNavLink to={routes.editorTileAssets}>{t("shared.headline_tile_asset_editor")}</UndoableNavLink>
                    <UndoableNavLink to={routes.editorAnimations}>{t("shared.headline_animations_editor")}</UndoableNavLink>
                    <UndoableNavLink to={routes.translationManagement}>{t("shared.headline_translation_management")}</UndoableNavLink>
                </DropdownMenuContent>
            </DropdownMenuContainer>
            &nbsp;
            <BackToManagementViewLink />
        </>
    );
});

export const HeaderLogoutButton: React.FunctionComponent = () => {
    const { t } = useTranslation();

    return (
        <NavLinkContainer href="#" onClick={logOut}>{t("editor.auth_log_out")}</NavLinkContainer>
    );
};

export const LoadingHeaderRightManagement: React.FunctionComponent = observer(() => {
    return (
        <HeaderRightContainer>
            <HeaderLogoutButton />
        </HeaderRightContainer>
    );
});

export const LoadingHeaderRightEditor: React.FunctionComponent = observer(() => {
    return (
        <HeaderRightContainer>
            <BackToManagementViewLink />
            <HeaderLogoutButton />
        </HeaderRightContainer>
    );
});
