import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";

export const ListItem = styled.div`
    display: block;
    background-color: white;
    width: calc(100% - 6px);
    margin: 1px;
    padding: 6px;
    text-align: left;
    cursor: pointer;
    border-radius: ${UiConstants.BORDER_RADIUS};
    border: solid 2px white;
    &:hover {
        background-color: ${UiConstants.COLOR_HOVER};
    }
    &.selected {
        margin: 1px;
        border: solid 2px black;
        color: white;
        background-color: ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
    }
`;

export const ListItemNoWrapping = styled(ListItem)`
    white-space: nowrap;
`;