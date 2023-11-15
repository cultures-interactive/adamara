import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";

export const KeyValueRow = styled.div`
    display: flex;
    flex-direction: row;
    flex: auto;
    margin-left: 8px;
    padding: 2px;

    &:hover {
        background-color: ${UiConstants.COLOR_HOVER};
    }
`;

export const ListEntryKey = styled.dt`
    display: flex;
    flex: 1;
    padding: 2px;
    min-width: 180px;
    align-self: center;
`;

export const ListEntryValue = styled.dt`
    display: flex;
    flex: 3;
    padding: 2px;
    align-self: center;
`;
