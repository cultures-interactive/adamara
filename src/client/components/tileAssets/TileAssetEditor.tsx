import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { TileAssetConfigurator } from './TileAssetConfigurator';
import { EditorTileAssetViewerContainer } from './EditorTileAssetViewerContainer';
import styled from "styled-components";
import { UndoRedoSlideMenu } from '../editor/UndoRedoSlideMenu';
import { TileAssetEditorTileSelector } from './TileAssetEditorTileSelector';

const Container = styled.div`
    padding-top: 40px;
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0.3em;
    right: 0.3em;
    bottom: 0.3em;
    top: 0.3em;
    overflow: hidden;
`;

const Row = styled.div`
    display: flex;
    flex-direction:row;
`;

export const TileAssetEditor: React.FunctionComponent = observer(() => {
    useEffect(() => {
        document.oncontextmenu = function (event) {
            event.preventDefault();
        };

        return () => {
            document.oncontextmenu = null;
        };
    }, []);

    return (
        <Container>
            <UndoRedoSlideMenu />
            <Row>
                <EditorTileAssetViewerContainer />
                <TileAssetConfigurator />
            </Row>
            <TileAssetEditorTileSelector />
        </Container>
    );
});
