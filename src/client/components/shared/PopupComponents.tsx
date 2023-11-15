import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";

export const Overlay = styled.div`
    z-index: ${UiConstants.Z_INDEX_EDITOR_NOTIFICATIONS_OVERLAY};
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
`;

export const CenterContainer = styled.div`
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
`;

export const PopupWindow = styled.div`
    background: white;
    padding: 15px;
    margin: 10px;
`;