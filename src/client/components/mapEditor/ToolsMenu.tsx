import React from 'react';
import { observer } from 'mobx-react-lite';
import { HeaderUndoRedo } from '../editor/HeaderUndoRedo';
import { MenuCard } from "../menu/MenuCard";
import { EditorToolType, mapEditorComplexities, MapEditorComplexity, mainMapEditorStore } from "../../stores/MapEditorStore";
import { undoableSelectTool } from "../../stores/undo/operation/SetPlacementSelectionOp";
import { useTranslation } from "react-i18next";
import { ToolButton } from "./ToolButton";
import styled from "styled-components";
import { HiCursorClick } from "react-icons/hi";
import { BsPencil } from "react-icons/bs";
import { PlacementSelectorPlaneSelection, PlacementSelectorGamePreviewCheckmark } from './PlacementSelectorComponents';
import { undoableSetMapEditorComplexity } from '../../stores/undo/operation/MapEditorSetMapEditorComplexity';
import { userStore } from '../../stores/UserStore';

export const Container = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
`;

export const FloatLeftMenuCard = styled(MenuCard)`
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
`;

export const FloatLeft = styled.div`
    float:left;
`;

export const ToolsMenu: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const { selectedTool } = mainMapEditorStore;

    return (
        <Container>
            <FloatLeftMenuCard>
                <HeaderUndoRedo />
            </FloatLeftMenuCard>

            <FloatLeftMenuCard>
                <ToolButton
                    onChange={() => undoableSelectTool(mainMapEditorStore, EditorToolType.SingleSelect)}
                    text={t("editor.select")}
                    icon={HiCursorClick}
                    checked={selectedTool === EditorToolType.SingleSelect}
                    floatLeft={true}>
                </ToolButton>

                <ToolButton
                    onChange={() => undoableSelectTool(mainMapEditorStore, EditorToolType.PlaceAsset)}
                    text={t("editor.place_asset")}
                    icon={BsPencil}
                    checked={selectedTool === EditorToolType.PlaceAsset}
                    floatLeft={true}>
                </ToolButton>
            </FloatLeftMenuCard>

            {userStore.showMapComplexitySelector && (
                <FloatLeftMenuCard>
                    {t("editor.map_editor_complexity")}:
                    &nbsp;
                    <select value={mainMapEditorStore.mapEditorComplexity} onChange={e => undoableSetMapEditorComplexity(e.target.value as MapEditorComplexity)}>
                        {mapEditorComplexities.map(complexity => (
                            <option key={complexity} value={complexity}>
                                {t("editor.map_editor_complexity_" + complexity)}
                            </option>
                        ))}
                    </select>
                </FloatLeftMenuCard>
            )}

            <FloatLeftMenuCard>
                <PlacementSelectorGamePreviewCheckmark mapRelatedStore={mainMapEditorStore} />
            </FloatLeftMenuCard>

            {mainMapEditorStore.complexityShowHeightPlanes && (
                <FloatLeftMenuCard>
                    <PlacementSelectorPlaneSelection mapRelatedStore={mainMapEditorStore} />
                </FloatLeftMenuCard>
            )}
        </Container>
    );
});
