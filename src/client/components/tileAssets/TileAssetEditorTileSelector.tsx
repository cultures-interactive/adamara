import React from 'react';
import { observer } from "mobx-react-lite";
import { PlacementSelectorLoadingBar, PlacementSelectorLayerSelection, PlacementSelectorGamePreviewCheckmark, PlacementSelectorHeadline, TileAssetPlacementButtons, PlacementSelectorAssetSearch, TileCategoryMenu, ContainerUnderHeadline } from '../mapEditor/PlacementSelectorComponents';
import styled from 'styled-components';
import { MenuCard } from '../menu/MenuCard';
import { tileAssetEditorStore } from '../../stores/TileAssetEditorStore';
import { SearchFilterCategory } from '../../stores/MapRelatedStore';
import { useTranslation } from 'react-i18next';
import { tileVisibilities, TileVisibility } from '../../../shared/resources/TileAssetModel';

const Container = styled.div`
    display: flex;
    flex-grow: 1;
    overflow: hidden;
`;

const InnerContainer = styled(MenuCard)`
    overflow: inherit;
    flex: 1;
`;

export const PlacementSelectorComplexitySelection: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const { onlyShowVisibility } = tileAssetEditorStore;

    return (
        <>
            {t("editor.tile_asset_visibility_in_editor")}:&nbsp;
            <select
                value={(onlyShowVisibility != null) ? onlyShowVisibility : ""}
                onChange={e => tileAssetEditorStore.setOnlyShowVisibility(e.target.value === "" ? null : +e.target.value)}
            >
                <option value={""} />
                {tileVisibilities.map(visibility =>
                    <option key={visibility} value={visibility}>
                        {t("editor.tile_asset_visibility_" + TileVisibility[visibility])}
                    </option>
                )}
            </select>
        </>
    );
});

export const TileAssetEditorTileSelector: React.FunctionComponent = observer(() => {
    return (
        <>
            <PlacementSelectorLoadingBar />
            <Container>
                <div>
                    <TileCategoryMenu mapRelatedStore={tileAssetEditorStore} skipMainCategories={false} />
                </div>
                <InnerContainer>
                    <PlacementSelectorHeadline>
                        <PlacementSelectorLayerSelection mapRelatedStore={tileAssetEditorStore} />
                        &nbsp;
                        |
                        &nbsp;
                        <PlacementSelectorAssetSearch mapRelatedStore={tileAssetEditorStore} category={SearchFilterCategory.TileAsset} />
                        &nbsp;
                        |
                        &nbsp;
                        <PlacementSelectorComplexitySelection />
                        &nbsp;
                        |
                        &nbsp;
                        <PlacementSelectorGamePreviewCheckmark mapRelatedStore={tileAssetEditorStore} />
                    </PlacementSelectorHeadline>

                    <ContainerUnderHeadline>
                        <TileAssetPlacementButtons
                            showEmpty={true}
                            tileAssets={tileAssetEditorStore.filteredTileAssets}
                            mapRelatedStore={tileAssetEditorStore}
                        />
                    </ContainerUnderHeadline>
                </InnerContainer>
            </Container>
        </>
    );
});
