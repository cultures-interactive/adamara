import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { faLink, faTimes } from "@fortawesome/free-solid-svg-icons";
import { CenterContainer, Overlay, PopupWindow } from '../shared/PopupComponents';
import { routes } from '../../data/routes';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { MapDeleteButton } from "./MapDeleteButton";
import { undoableMapEditorCloseCurrentMap } from "../../stores/undo/operation/MapEditorCloseCurrentMapOp";
import { undoableMapEditorDeleteMap } from "../../stores/undo/operation/MapEditorDeleteMapOp";
import { PopupSubMenu, Orientation, PopupSubMenuIconContainer } from "../menu/PopupSubMenu";
import { MenuCardSubLabel } from "../menu/MenuCardSubLabel";
import { undoableMapEditorCreateMap } from "../../stores/undo/operation/MapEditorCreateMapOp";
import { FaPlus } from "react-icons/fa";
import { MenuCard } from "../menu/MenuCard";
import { MapSettingsComponent } from "./MapSettingsComponent";
import { MenuCardLabel } from "../menu/MenuCardLabel";
import { InputWithMargin } from "../editor/Input";
import { editorStore } from "../../stores/EditorStore";
import { BsGearFill } from "react-icons/bs";
import { mainMapEditorStore } from "../../stores/MapEditorStore";

const Row = styled.div`
    display: flex;
    flex-direction: row;
    margin-left: 8px;
    margin-top: 4px;
    margin-bottom: 4px;
    align-items: center;
`;

const Title = styled.h3`
    margin: 2px;
    color: black;
`;

const StyledButton = styled.button`
    display: flex;
    flex-direction: row;
    flex-shrink: 0;
    margin: 2px;
    cursor: pointer;
`;

const MarginIcon = styled(FontAwesomeIcon)`
    margin-right: 4px;
`;

interface Props {
    openButtonDisabled: boolean;
}

export const MapOperationsMenu: React.FunctionComponent<Props> = observer(
    ({ openButtonDisabled }) => {
        const { t } = useTranslation();
        const { currentMap, runningMapOperation, currentMapId } = mainMapEditorStore.currentMapStore;

        const [showURLs, setShowURLs] = React.useState([]);
        const [newMapName, setNewMapName] = useState("");

        const triggerShowURLs = () => {
            const base = location.origin;
            const params = "?map=" + currentMapId;
            setShowURLs([
                [/*t*/"editor.open_map_in_map_editor_url", base + routes.editorMap + params],
                [/*t*/"editor.open_map_in_game_editor_mode_url", base + routes.editorGame + params],
                //[/*t*/"editor.open_map_in_game_only_mode_url", base + routes.game + params]
            ]);
        };

        const createNewMap = () => {
            undoableMapEditorCreateMap(newMapName);
            setNewMapName("");
        };

        return (
            <>
                <PopupSubMenu
                    orientation={Orientation.Right}
                    relativeOffset={0.25}
                    disabled={openButtonDisabled}
                    positionFixed={true}
                    containerWidth="400px"
                    buttonContent={<PopupSubMenuIconContainer><BsGearFill /></PopupSubMenuIconContainer>}
                >
                    {
                        currentMap && (editorStore.isMainGameEditor || currentMap.moduleOwner === editorStore.sessionModuleId) &&
                        (
                            <MenuCard>
                                <MenuCardLabel>{t("editor.map") + ": " + currentMap.properties.name}</MenuCardLabel>
                                <MenuCardSubLabel>{t("editor.map_operations")}</MenuCardSubLabel>
                                <Row>
                                    <StyledButton
                                        onClick={() => undoableMapEditorCloseCurrentMap(mainMapEditorStore.currentMapStore)}
                                        disabled={runningMapOperation || !currentMap}
                                    >
                                        <MarginIcon icon={faTimes} />
                                        {t("editor.close_map")}
                                    </StyledButton>

                                    <MapDeleteButton
                                        onConfirm={() => undoableMapEditorDeleteMap(currentMapId)} disabled={runningMapOperation || !currentMap} />
                                    <StyledButton
                                        onClick={triggerShowURLs}
                                        disabled={runningMapOperation || !currentMap}
                                    >
                                        <MarginIcon icon={faLink} />
                                        {t("editor.get_direct_links")}
                                    </StyledButton>
                                </Row>
                                <MapSettingsComponent />
                            </MenuCard>
                        )
                    }
                    <MenuCard>
                        <Title>{t("editor.map_create")}</Title>
                        <Row>
                            {t("editor.map_name")}
                            <InputWithMargin disabled={runningMapOperation}
                                type="text" value={newMapName}
                                onChange={e => setNewMapName(e.target.value)}
                            />
                            <StyledButton
                                disabled={runningMapOperation || !newMapName}
                                onClick={createNewMap}><FaPlus /> {t("editor.create_new_map")}
                            </StyledButton>
                        </Row>
                    </MenuCard>
                </PopupSubMenu>
                {showURLs?.length > 0 && (
                    <Overlay>
                        <CenterContainer>
                            <PopupWindow>
                                {showURLs.map(([label, url]) => <div key={url}>{t(label)}: <a href={url}>{url}</a></div>)}
                                <button onClick={() => setShowURLs([])}>X</button>
                            </PopupWindow>
                        </CenterContainer>
                    </Overlay>
                )}
            </>
        );
    }
);
