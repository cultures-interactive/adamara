import React, { Component } from "react";
import styled from "styled-components";
import { selectorMapEditorStore } from "../../../../stores/MapEditorStore";
import { createActionMapViewer, disposeActionMapViewer, getActionMapViewer } from "./ActionMapViewer";

const Container = styled.div`
    height: 100%;
`;

export class ActionMapContainer extends Component {
    private refElement: HTMLElement;

    public componentDidMount() {
        createActionMapViewer();
        getActionMapViewer().attach(this.refElement);
        selectorMapEditorStore.increaseActionMapEditorOpenCounter();
    }

    public componentWillUnmount() {
        disposeActionMapViewer();
    }

    public render() {
        return (
            <Container ref={ref => {
                this.refElement = ref;

                const editorMapViewer = getActionMapViewer();
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
