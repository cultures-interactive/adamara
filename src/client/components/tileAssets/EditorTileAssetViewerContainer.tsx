import React, { Component } from 'react';
import styled from 'styled-components';
import { createEditorTileAssetViewer, disposeEditorTileAssetViewer, getEditorTileAssetViewer } from '../../canvas/editor/tileAssetViewer/EditorTileAssetViewer';

const Container = styled.div`
    padding: 3px;
`;

export class EditorTileAssetViewerContainer extends Component {
    private refElement: HTMLElement;

    public componentDidMount() {
        createEditorTileAssetViewer();
        getEditorTileAssetViewer().attach(this.refElement);
    }

    public componentWillUnmount() {
        disposeEditorTileAssetViewer();
    }

    public render() {
        return (
            <Container>
                <div ref={ref => {
                    this.refElement = ref;

                    const tileAssetViewer = getEditorTileAssetViewer();
                    if (!tileAssetViewer)
                        return;

                    if (ref) {
                        tileAssetViewer.attach(ref);
                    } else {
                        tileAssetViewer.detach();
                    }
                }} />
            </Container>
        );
    }
}
