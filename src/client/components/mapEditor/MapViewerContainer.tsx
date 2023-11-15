import React, { Component } from 'react';
import styled from 'styled-components';
import { disposeEditorMapViewer, getEditorMapViewer, createEditorMapViewer } from '../../canvas/editor/EditorMapViewer';

const Container = styled.div`
    height: 100%;
`;

// This is a class-based component to have proper mounting/dismounting with hot reloading.
// See the comment in GameContainer.tsx for more details.
export class MapViewerContainer extends Component {
    private refElement: HTMLElement;

    public componentDidMount() {
        createEditorMapViewer();
        getEditorMapViewer().attach(this.refElement);
    }

    public componentWillUnmount() {
        disposeEditorMapViewer();
    }

    public render() {
        return (
            <Container ref={ref => {
                this.refElement = ref;

                const editorMapViewer = getEditorMapViewer();
                if (!editorMapViewer)
                    return;

                if (ref) {
                    editorMapViewer.attach(ref);
                } else {
                    editorMapViewer.detach();
                }
            }} />
        );
    }
}

/*
export const MapViewerContainer: React.FunctionComponent = () => {
    const mapViewerDivRef = usePixiApp(createEditorMapViewer, getEditorMapViewer, disposeEditorMapViewer);

    return (
        <Container ref={mapViewerDivRef} />
    );
};
*/