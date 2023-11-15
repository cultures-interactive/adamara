import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TileDataModel } from '../../../shared/game/TileDataModel';
import { CurrentMapStore } from '../../stores/CurrentMapStore';
import { gameStore } from '../../stores/GameStore';
import { sharedStore } from '../../stores/SharedStore';
import { executableUndoableMapEditorSetTileInteractionTriggerLabel, executableUndoableMapEditorSetTileInteractionTriggerStatus, executableUndoableMapEditorSetTileModuleGateStatus } from '../../stores/undo/operation/MapEditorSetTileInteractionTriggerData';
import { MenuCard } from '../menu/MenuCard';
import { ElementTitleDisplay, LabelInput } from './DynamicMapElementPropertiesSharedElements';

interface Props {
    tileData: TileDataModel;
    currentMapStore: CurrentMapStore;
}

export const InteractionTriggerTilePropertiesEditor: React.FunctionComponent<Props> = observer(({
    tileData, currentMapStore
}) => {
    const { t } = useTranslation();

    if (!tileData.interactionTriggerData)
        return null;

    const name = sharedStore.getTileAsset(tileData.tileAssetId)?.localizedName.get(gameStore.languageKey);

    return (
        <MenuCard>
            <ElementTitleDisplay
                element={tileData}
                elementTypeKey={/*t*/"editor.editor_display_type_tile_decoration"}
                name={name}
            />
            <table>
                <tbody>
                    <tr>
                        <td colSpan={2}>
                            <label>
                                <input type="checkbox" checked={true} onChange={() => executableUndoableMapEditorSetTileInteractionTriggerStatus(currentMapStore, tileData, false)} />&nbsp;
                                {t("editor.element_is_interaction_trigger")}
                            </label>
                        </td>
                    </tr>
                    {!currentMapStore.isCurrentMapPartOfTheModule && <tr>
                        <td colSpan={2}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={tileData.interactionTriggerData.isModuleGate}
                                    onChange={() => executableUndoableMapEditorSetTileModuleGateStatus(currentMapStore, tileData, !tileData.interactionTriggerData.isModuleGate)}
                                />&nbsp;
                                {t("editor.element_is_module_gate_interaction_trigger")}
                            </label>
                        </td>
                    </tr>}
                    <LabelInput
                        element={tileData.interactionTriggerData}
                        allElements={currentMapStore.currentMap.interactionTriggerTiles.map(tile => tile.interactionTriggerData)}
                        alreadyUsedWarningLabelKey={/*t*/"editor.warning_tile_interaction_trigger_label_already_used"}
                        onChange={value => executableUndoableMapEditorSetTileInteractionTriggerLabel(currentMapStore, tileData, value)}
                    />
                </tbody>
            </table>
        </MenuCard>
    );
});