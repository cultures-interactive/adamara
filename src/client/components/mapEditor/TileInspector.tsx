import { observer } from 'mobx-react-lite';
import React from 'react';
import { EditorTileInspector } from "./EditorTileInspector";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaste } from '@fortawesome/free-solid-svg-icons';
import { MenuCard } from '../menu/MenuCard';
import { getLocalizedDynamicMapElementDisplayNameWithPosition } from '../../helper/displayHelpers';
import { useTranslation } from 'react-i18next';
import { undoableMapEditorDynamicMapElementPaste } from '../../stores/undo/operation/MapEditorSubmitCurrentMapDynamicMapElementsChangesOp';
import { DynamicMapElementPropertiesEditor } from './DynamicMapElementPropertiesEditor';
import { InteractionTriggerTilePropertiesEditor } from './InteractionTriggerTilePropertiesEditor';
import { LayerEditButton } from './EditorTileInspectorLayer';
import styled from 'styled-components';
import { MapEditorStore } from '../../stores/MapEditorStore';
import { DebugStartMarkerPropertiesEditor } from './DebugStartMarkerPropertiesEditor';
import { Adjustment, SlideMenu, State } from '../menu/SlideMenu';
import { undoableMapEditorSelectTile } from '../../stores/undo/operation/MapEditorEntitySelectionOp';
import { MdContentPasteOff } from 'react-icons/md';
import { undoableMapEditorClearDynamicMapElementClipboard } from '../../stores/undo/operation/MapEditorClearDynamicMapElementClipboard';

const PasteButton = styled(LayerEditButton)`
    float: right;
`;

const TopPadding = styled.div`
    padding: 14px;  
`;

interface TileInspectorProps {
    mapEditorStore: MapEditorStore;
    hideEditorTileInspector?: boolean;
}

const inspectorMenuTop = 40;
const assetsMenuHeight = 260;

export const TileInspector: React.FunctionComponent<TileInspectorProps> = observer(({ mapEditorStore, hideEditorTileInspector = false }) => {
    const { t } = useTranslation();

    const { cutDynamicMapElement, currentMapStore } = mapEditorStore;

    if (!mapEditorStore.hasSelectedTile)
        return null;

    if (hideEditorTileInspector && !currentMapStore.isUserAllowedToEditCurrentMap)
        return null;

    return (
        <SlideMenu
            identifier={"inspector"}
            orientation={Adjustment.Right}
            start={inspectorMenuTop}
            width={290}
            maxHeight={`calc(100vh - ${inspectorMenuTop}px - ${assetsMenuHeight}px)`}
            state={State.Expanded}
            collapsible={true}
            ignorePersistedExpansionState={true}
            notAnimated={true}
            onUserToggle={() => undoableMapEditorSelectTile(null, mapEditorStore, false)}
        >
            {!hideEditorTileInspector && <EditorTileInspector mapEditorStore={mapEditorStore} />}
            {hideEditorTileInspector && <TopPadding />}
            {mapEditorStore.hasCutDynamicMapElement && (
                <MenuCard>
                    {getLocalizedDynamicMapElementDisplayNameWithPosition(t, cutDynamicMapElement, false)}
                    &nbsp;
                    <PasteButton onClick={() => undoableMapEditorDynamicMapElementPaste(mapEditorStore.selectedTilePosition, mapEditorStore)}><FontAwesomeIcon icon={faPaste} /></PasteButton>
                    <PasteButton onClick={() => undoableMapEditorClearDynamicMapElementClipboard(mapEditorStore)}><MdContentPasteOff /></PasteButton>
                </MenuCard>
            )}
            {currentMapStore.isUserAllowedToEditCurrentMap && <>
                {mapEditorStore.selectedInteractionTriggerTiles.map(tileData => <InteractionTriggerTilePropertiesEditor key={tileData.$modelId} tileData={tileData} currentMapStore={currentMapStore} />)}
                {mapEditorStore.selectedDynamicMapElements.map(element => <DynamicMapElementPropertiesEditor key={element.$modelId} element={element} mapEditorStore={mapEditorStore} />)}
                {mapEditorStore.selectedDebugStartMarker && <DebugStartMarkerPropertiesEditor />}
            </>}
        </SlideMenu>
    );
});