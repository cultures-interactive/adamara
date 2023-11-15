import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { ObjectNavigator } from './ObjectNavigator';
import { MapViewerContainer } from './MapViewerContainer';
import { Adjustment, SlideMenu, State } from "../menu/SlideMenu";
import { ToolsMenu } from "./ToolsMenu";
import { FaUserCheck, FaUserFriends } from "react-icons/fa";
import { TiImageOutline } from "react-icons/ti";
import { FiTool } from "react-icons/fi";
import { TileInspector } from './TileInspector';
import { MapEditorPlacementSelector } from './MapEditorPlacementSelector';
import { GameStatsContainer } from '../debug/GameStatsContainer';
import { localSettingsStore } from '../../stores/LocalSettingsStore';
import { MapUserOverview } from './MapUserOverview';
import { MapPropertiesMenu } from './MapPropertiesMenu';
import { mainMapEditorStore } from '../../stores/MapEditorStore';
import { EditorCharacterPopup } from '../character/EditorCharacterPopup';
import { CurrentMapTracker } from './CurrentMapTracker';

const FullscreenContainer = styled.div`
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
`;

export const MapEditor: React.FunctionComponent = observer(() => {
    const { currentMapStore } = mainMapEditorStore;
    const { hasCurrentMap } = currentMapStore;

    const assetsMenuHeight = 260;

    useEffect(() => {
        document.oncontextmenu = function (event) {
            event.preventDefault();
        };

        return () => {
            document.oncontextmenu = null;
        };
    }, []);

    return (
        <div>
            <FullscreenContainer>
                {hasCurrentMap && <MapViewerContainer />}
            </FullscreenContainer>

            <GameStatsContainer />
            <EditorCharacterPopup />
            <CurrentMapTracker />

            {localSettingsStore.isProductionEditor && (
                <SlideMenu
                    identifier={"map-user-overview"}
                    orientation={Adjustment.Top}
                    start={800}
                    width={220}
                    icon={<FaUserCheck />}
                    state={State.Expanded}
                    collapsible={true}
                >
                    <MapUserOverview />
                </SlideMenu>
            )}

            {currentMapStore.currentMap && (
                <TileInspector
                    mapEditorStore={mainMapEditorStore}
                />
            )}

            <SlideMenu
                identifier={"tools-menu"}
                orientation={Adjustment.Top}
                start={300}
                width={470}
                icon={<FiTool />}
                state={State.Expanded}
                collapsible={true}
            >
                <ToolsMenu />
            </SlideMenu>

            <SlideMenu
                identifier={"hierarchy"}
                orientation={Adjustment.Left}
                start={40}
                width={290}
                icon={<FaUserFriends />}
                state={State.Expanded}
                collapsible={true}
            >
                <MapPropertiesMenu />
                {hasCurrentMap && <ObjectNavigator />}
            </SlideMenu>

            {currentMapStore.isUserAllowedToEditCurrentMap && <>
                <SlideMenu
                    identifier={"assets"}
                    orientation={Adjustment.Bottom}
                    start={0}
                    width={"100%"}
                    height={assetsMenuHeight}
                    icon={<TiImageOutline />}
                    state={State.Expanded}
                    collapsible={true}
                    menuOverflow='hidden'
                    contentHeight='calc(100% - 4px)'
                >
                    <MapEditorPlacementSelector />
                </SlideMenu>
            </>}
        </div>
    );
});
