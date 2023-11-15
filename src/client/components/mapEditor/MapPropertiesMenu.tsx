import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { MapSelector } from './MapSelector';
import { undoableMapEditorLoadMap } from "../../stores/undo/operation/MapEditorLoadMapOp";
import { MenuCard } from '../menu/MenuCard';
import { MenuCardLabel } from "../menu/MenuCardLabel";
import styled from "styled-components";
import { MapOperationsMenu } from './MapOperationsMenu';
import { LoadingBar } from '../shared/LoadingBar';
import { editorStore } from '../../stores/EditorStore';
import { sharedStore } from '../../stores/SharedStore';
import { mainMapEditorStore } from '../../stores/MapEditorStore';

const MapOptionsGrid = styled.div`
    display: grid;
    grid-template-columns: auto 8px 34px;
`;

export const MapPropertiesMenu: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const { allTileAssetsLoaded, mayOpenMap } = sharedStore;

    const { currentMapId, runningMapOperation } = mainMapEditorStore.currentMapStore;

    return (
        <MenuCard>
            <table>
                <tbody>
                    <tr>
                        <td>
                            <MenuCardLabel>{t("editor.map")}</MenuCardLabel>
                            <MapOptionsGrid>
                                <MapSelector
                                    selectedMapId={currentMapId}
                                    onSelected={mapId => undoableMapEditorLoadMap(mainMapEditorStore.currentMapStore, mapId)}
                                    disabled={!mayOpenMap || runningMapOperation}
                                    width100percent={true}
                                />
                                <span />
                                <MapOperationsMenu openButtonDisabled={!mayOpenMap} />
                            </MapOptionsGrid>
                            {!allTileAssetsLoaded && (
                                <div>
                                    <LoadingBar
                                        label={t("editor.loading_please_wait")}
                                        percentage100={editorStore.tileImageLoadingPercentageInt100}
                                        fontScale={0.7}
                                    />
                                </div>
                            )}
                        </td>
                    </tr>
                </tbody>
            </table>
        </MenuCard>
    );
});
