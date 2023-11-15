import React from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";

interface ContainerProps {
    size: string;
}

const Container = styled.svg<ContainerProps>`
    animation: rotate 2s linear infinite;
    margin: 0px;
    width: ${props => props.size};
    height: ${props => props.size};
      
    & .path {
        stroke-linecap: round;
        animation: dash 1.5s ease-in-out infinite;
    }
      
    @keyframes rotate {
        100% {
            transform: rotate(360deg);
        }
    }
    @keyframes dash {
        0% {
            stroke-dasharray: 1, 150;
            stroke-dashoffset: 0;
        }
        50% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -35;
        }
        100% {
            stroke-dasharray: 90, 150;
            stroke-dashoffset: -124;
        }
    }
`;

export const LoadingSpinner: React.FunctionComponent = observer(() => {
    return (
        <Container viewBox="0 0 50 50" size={"30px"}>
            <circle
                className="path"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                strokeWidth="4"
                stroke={UiConstants.COLOR_SELECTION_HIGHLIGHT}
            />
        </Container>
    );
});

export const LoadingSpinnerBlack: React.FunctionComponent = observer(() => {
    return (
        <Container viewBox="0 0 50 50" size={"30px"}>
            <circle
                className="path"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                strokeWidth="4"
                stroke={"black"}
            />
        </Container>
    );
});

export const LoadingSpinnerSmall: React.FunctionComponent = observer(() => {
    return (
        <Container viewBox="0 0 50 50" size={"16px"}>
            <circle
                className="path"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                strokeWidth="4"
                stroke={"black"}
            />
        </Container>
    );
});
