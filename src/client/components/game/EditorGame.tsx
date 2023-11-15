import { TFunction } from 'i18next';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { editorStore } from '../../stores/EditorStore';
import { gameStore } from '../../stores/GameStore';
import { mainMapEditorStore } from '../../stores/MapEditorStore';
import { sharedStore } from '../../stores/SharedStore';
import { undoableMapEditorLoadMap } from '../../stores/undo/operation/MapEditorLoadMapOp';
import { MapSelector } from '../mapEditor/MapSelector';
import { MenuCard } from '../menu/MenuCard';
import { MenuCardLabel } from '../menu/MenuCardLabel';
import { LoadingBarBlock } from '../shared/LoadingBar';
import { GameContainer } from './GameContainer';
import { PlayerCharacterEditor } from "./PlayerCharacterEditor";

const FullscreenContainer = styled.div`
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background-color: black;
`;

const TopLeft = styled.div`
    position: fixed;
    left: 2em;
    top: 4em;
`;

function getErrorText(t: TFunction) {
    if (!sharedStore.mayOpenGame) {
        return (
            <>
                <LoadingBarBlock
                    label={t("editor.loading_tile_images")}
                    percentage100={editorStore.tileImageLoadingPercentageInt100}
                />
                <LoadingBarBlock
                    label={t("editor.loading_sounds")}
                    percentage100={Math.floor(sharedStore.gameSoundsLoadingPercentage * 100)}
                />
            </>
        );
    }

    if (!gameStore.hasStartMap) {
        const { currentMapId, runningMapOperation } = mainMapEditorStore.currentMapStore;

        return (
            <>
                <MenuCard>
                    <MenuCardLabel>{t("editor.map")}</MenuCardLabel>
                    <MapSelector
                        selectedMapId={currentMapId}
                        onSelected={mapId => undoableMapEditorLoadMap(mainMapEditorStore.currentMapStore, mapId)}
                        disabled={runningMapOperation}
                        width100percent={true}
                    />
                </MenuCard>
            </>
        );
    }

    return null;
}

export const EditorGame: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const errorText = getErrorText(t);

    const showCharacterEditor = !gameStore.character && !errorText;
    const showGame = !showCharacterEditor && !errorText;

    return (
        <FullscreenContainer>
            {showGame && <GameContainer />}
            {showCharacterEditor && <PlayerCharacterEditor />}
            {errorText && <TopLeft>{errorText}</TopLeft>}
        </FullscreenContainer>
    );
});
