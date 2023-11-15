import React, { } from "react";
import styled, { css } from "styled-components";
import { UiConstants } from "../../../data/UiConstants";
import { NoMapElementIcon } from "../../editor/ElementIcons";

export const SelectorButton = styled.button<{ bgColor?: string; }>`
    padding: 0;
    width: 140px;
    background-color: ${props => props.bgColor};
    overflow: hidden;
    overflow-wrap: anywhere;
    flex-shrink: 0;

    &.invalid {
        outline: 2px solid ${UiConstants.COLOR_VALUE_INVALID};
        border-radius: 2px;
        border-color: rgba(0, 0, 0, 0);
    }
`;

export const SelectorButtonContent = styled.div<{ flexibleHeight?: boolean; }>`
    position: relative;
    width: 140px;
    display: flex;
    flex-direction: column;
    align-items: center;
    ${props => !props.flexibleHeight && css`height: 75px;`}
    ${props => props.flexibleHeight && css`min-height: 75px;`}
`;

const SelectorImage = styled.img`
    max-width: 80px;
    max-height: 50px;
    object-fit: contain;
    min-width: 0;
    min-height: 0;
    flex-grow: 1;
`;

const SecondaryText = styled.div`
    font-size: x-small;
`;

export interface SelectorButtonContentProps {
    image: string;
    icon: JSX.Element;
    text: string;
    secondaryText?: string;
    flexibleHeight?: boolean;
}

export const SelectorButtonContentFilled: React.FunctionComponent<SelectorButtonContentProps> = ({ image, icon, text, secondaryText, flexibleHeight, children }) => {
    return (
        <SelectorButtonContent flexibleHeight={flexibleHeight}>
            {children}
            {image && <SelectorImage src={image} />}
            {!image && (icon || <NoMapElementIcon />)}
            <div>{text}</div>
            {secondaryText && <SecondaryText>{secondaryText}</SecondaryText>}
        </SelectorButtonContent>
    );
};