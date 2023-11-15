import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";

export const Input = styled.input`
    &.invalid {
        outline: 2px solid ${UiConstants.COLOR_VALUE_INVALID};
        border-radius: 2px;
        border-color: rgba(0, 0, 0, 0);
    }

    &:focus {
        outline: 2px solid ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
        border-radius: 2px;
        border-color: rgba(0, 0, 0, 0);
    }
    
    &:focus.invalid {
        outline: 2px solid ${UiConstants.COLOR_VALUE_INVALID};
        border-radius: 2px;
        border-color: rgba(0, 0, 0, 0);
    }
`;

export const InputWithMargin = styled(Input)`
    margin: 4px;
`;