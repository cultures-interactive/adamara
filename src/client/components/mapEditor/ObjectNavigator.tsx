import React from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { getDynamicMapElementName } from "../../helper/displayHelpers";
import { MenuCardLabel } from "../menu/MenuCardLabel";
import { MenuCard } from "../menu/MenuCard";
import { MenuCardScrollContainer } from "../menu/MenuCardScrollContainer";
import { undoableMapEditorSelectTile } from '../../stores/undo/operation/MapEditorEntitySelectionOp';
import { AdvancedListItem } from "../shared/AdvancedListItem";
import { TilePosition } from '../../../shared/definitions/other/TilePosition';
import { DynamicMapElementModel } from '../../../shared/game/dynamicMapElements/DynamicMapElement';
import { DynamicMapElementChangeGroup, groupUndoableMapEditorDynamicMapElementChanges } from '../../stores/undo/operation/MapEditorSubmitCurrentMapDynamicMapElementsChangesOp';
import { mainMapEditorStore } from '../../stores/MapEditorStore';
import { getIconForElementPartOfText } from '../../helper/mapElementIconHelper';

const ScrollContainer = styled(MenuCardScrollContainer)`
    max-height: 300px;
`;

export const ObjectNavigator: React.FunctionComponent = observer(() => {
    const { currentMap, isUserAllowedToEditCurrentMap } = mainMapEditorStore.currentMapStore;

    const { t } = useTranslation();

    function onSelect(element: { position: TilePosition; }) {
        undoableMapEditorSelectTile(element.position, mainMapEditorStore, true);
    }

    function deleteElement(element: DynamicMapElementModel<any>) {
        groupUndoableMapEditorDynamicMapElementChanges(DynamicMapElementChangeGroup.Delete, () => {
            currentMap.removeDynamicMapElement(element);
        });
    }

    return (
        <MenuCard>
            <MenuCardLabel>
                {t("editor.objects")}
            </MenuCardLabel>
            {(currentMap.dynamicMapElements.length > 0) &&
                <ScrollContainer>
                    {currentMap.dynamicMapElements.map(element => (
                        <AdvancedListItem
                            key={element.$modelId}
                            itemObject={element}
                            icon={getIconForElementPartOfText(element)}
                            itemName={getDynamicMapElementName(element, true)}
                            itemId={-1} // not needed in this case
                            isSelected={mainMapEditorStore.isSelectedTilePosition(element.position)}
                            onSelectItem={onSelect}
                            onConfirmDelete={() => { deleteElement(element); }}
                            deleteWithoutConfirmation={true}
                            allowDeletion={isUserAllowedToEditCurrentMap}
                        />
                    ))}
                    {currentMap.interactionTriggerTiles.map(tile => (
                        <AdvancedListItem
                            key={tile.$modelId}
                            itemObject={tile}
                            icon={getIconForElementPartOfText(tile)}
                            itemName={tile.interactionTriggerData.label || ""}
                            itemId={-1} // not needed in this case
                            isSelected={mainMapEditorStore.isSelectedTilePosition(tile.position)}
                            onSelectItem={onSelect}
                            onConfirmDelete={undefined}
                            i18nKeyDeleteModalMessage={undefined}
                            i18nKeyDeleteModalTitle={undefined}
                            allowDeletion={isUserAllowedToEditCurrentMap}
                        />
                    ))}
                </ScrollContainer>
            }
        </MenuCard>
    );
});
