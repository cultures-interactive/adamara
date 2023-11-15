import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";

export interface StyleInterface {
    minHeight: string;
    minWidth: string;
    maxHeight: string;
    maxWidth: string;
}

export const MenuCard = styled.div.attrs((props?: StyleInterface) => props)`
    border-radius: ${UiConstants.BORDER_RADIUS};
    background-color: white;
    overflow: auto;
    border: 1px solid darkgray;
    padding: 4px;
    margin: 2px;
    &:hover {
        /*border: 1px solid black;*/
    }
    min-width: ${(props) => props.minWidth};
    min-height: ${(props) => props.minHeight};
    max-width: ${(props) => props.maxWidth};
    max-height: ${(props) => props.maxHeight};
`;

export const MenuCardOverflowUnset = styled(MenuCard)`
    overflow: unset;
`;