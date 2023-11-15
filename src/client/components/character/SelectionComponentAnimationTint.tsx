import React from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { CharacterEditorStore } from "../../stores/CharacterEditorStore";

const Container = styled.div`
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-column-gap: 8px;
    grid-row-gap: 8px;
    margin-bottom: 20px;
    margin-left: 10px;
    margin-top: 10px;
`;

const ColorSelectionItem = styled.div`
    width: 34px;
    height: 34px;
    background-color: ${props => props.color};
    border: black 4px solid;
    cursor: pointer;

    &.selected {
        border: cadetblue 4px solid;
    }
`;

interface Props {
    hexColors: string[];
    store: CharacterEditorStore;
    onColorSelectionChange: (hexColor: string) => void;
}

export const SelectionComponentAnimationTint: React.FunctionComponent<Props> = observer((props) => {
    return (
        <Container>
            {
                props.hexColors.map(hexColor => (
                    <ColorSelectionItem
                        key={hexColor}
                        color={hexColor}
                        className={props.store.selectedCharacterConfiguration.tintColorHex == hexColor ? "selected" : ""}
                        onClick={(_) => {
                            props.onColorSelectionChange(hexColor);
                        }}
                    />
                ))
            }
        </Container>
    );
});
