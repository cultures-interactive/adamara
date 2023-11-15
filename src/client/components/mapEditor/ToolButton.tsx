import React from "react";
import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";
import { IconType } from "react-icons";

interface ToolButtonProperties {
    onChange: () => void;
    text: string;
    icon: IconType;
    checked: boolean;
    disabled?: boolean;
    floatLeft?: boolean;
}

export const Area = styled.div`
    background-color: ${UiConstants.COLOR_DARK_BUTTON};
    border-radius: ${UiConstants.BORDER_RADIUS};
    text-align: center;
    color: white;
    height: 40px;
    width: 40px;
    margin: 1px;
    padding: 2px;
    font-size: x-small;
    cursor: pointer;
    &:hover {
        background-color: ${UiConstants.COLOR_DARK_BUTTON_HOVER};
    }
    &.selected {
        background-color: ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
        border: 2px solid black;
    }
    &.disabled {
        cursor: not-allowed;
        background-color: ${UiConstants.COLOR_DISABLED};
    }
    &.row {
        float: left;
    }
`;

export const IconFont = styled.div`
    font-size: x-large;
`;

export const ToolButton: React.FunctionComponent<ToolButtonProperties> = (properties) => {

    const handleClick = () => {
        if (!properties.disabled) properties.onChange();
    };

    let classNames: string;
    if (properties.disabled) classNames = properties.disabled ? 'disabled' : '';
    else classNames = properties.checked ? 'selected' : '';

    if (properties.floatLeft) classNames += ' row';

    return (
        <Area
            onClick={handleClick}
            className={classNames}
        >
            {properties.text}<br />
            <IconFont>
                {React.createElement(properties.icon, { color: '#FFF' })}
            </IconFont>
        </Area>
    );
};
