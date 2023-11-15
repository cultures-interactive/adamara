import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";

export const MenuCardScrollContainer = styled.div`
    max-height: 300px;
    overflow: auto;
    border-radius: ${UiConstants.BORDER_RADIUS};
    border: solid 1px #888888;
`;
