import styled, { css } from "styled-components";

interface Props {
    error?: boolean;
}

export const Input = styled.input<Props>`
    ${props => props.error ? css`
        border: solid 2px red;

        &:focus {
            background-color: #FFCCCC;
        }
    ` : null}

    &.invalid {
        border: solid 2px red;
    }

    &.invalid:focus {
        background-color: #FFCCCC;
    }
`;
