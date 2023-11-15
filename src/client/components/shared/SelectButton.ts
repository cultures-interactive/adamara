import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";

export const SelectButton = styled.a`
    float: left;
    margin: 2px;
    padding-top: 2px;
    padding-bottom: 2px;
    padding-left: 6px;
    padding-right: 6px;

    border-radius: ${UiConstants.BORDER_RADIUS};
    background-color: ${UiConstants.COLOR_DARK_BUTTON};
    color: white;

    &:hover {
        cursor: pointer;
        background-color: ${UiConstants.COLOR_DARK_BUTTON_HOVER};
    }

    &.selected {
        padding-top: 0;
        padding-bottom: 0;
        background-color: ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
        border: 2px solid black;
    }

    &.block {
        display: block;
        float: none;
    }
`;
