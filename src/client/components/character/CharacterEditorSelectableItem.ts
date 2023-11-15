import styled from "styled-components";
import { CharacterEditorColorPrimary, CharacterEditorColorSecondary } from "../game/ui components/GameUIElements";

export const CharacterEditorSelectableItem = styled.div`
    display: flex;
    flex-direction: column;
    border: #406d6d 2px solid;
    border-radius: 4px;
    font-size: large;
    width: 100px;
    height: 200px;
    padding: 5px;
    margin: 5px;
    cursor: pointer;
    background-color: ${CharacterEditorColorPrimary};

    &.selected {
        background-color: ${CharacterEditorColorSecondary};
        border: white 4px solid;
    }
`;
