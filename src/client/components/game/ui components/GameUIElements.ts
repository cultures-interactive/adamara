import styled, { keyframes } from "styled-components";
import { UiConstants } from "../../../data/UiConstants";
import { Heading1Base } from "../../shared/Heading";
import { Button } from "./NineSlices";

export const BackgroundColorPrimary = "#CCCCCC";
export const BackgroundColorSecondary = "#FFFFFF";
export const BackgroundColorSecondaryFlash = "#4dc1cb";

export const BackgroundColorElement = "#EEEEEE";
export const BackgroundColorElementActive = "#FFFFFF";

export const CharacterEditorColorPrimary = "#333333";
export const CharacterEditorColorSecondary = "#555555";
export const CharacterEditorColorButton = "#CCCCCC";

export const BorderColor = "#0f0e12";
export const TabBorderColor = "#FFFFFF";
export const BorderPrimary = "border: 1px solid " + BorderColor + ";";

export const FontColorMain = "#000000";
export const FontColorModerate = "#000000";
export const FontColorHighlight = "#000000";
export const FontColorLowlight = "#444444";
export const FontColorLight = "#EEEEEE";

export const FontColorWarn = "#b16969";

export const FontFamily = "";
export const FontFamilyDebug = "font-family: monospace";

export const BoxShadowInset = "box-shadow: inset 0px -2px 8px 1px rgba(0,0,0,0.4);";

export const MenuDefaultWidth = "300px";

export const GUIBox = styled.div`
    background-color: ${BackgroundColorSecondary};
    color: ${FontColorMain};
    margin: 0px;
    padding: 4px;
    border-radius: ${UiConstants.BORDER_RADIUS};
    ${FontFamily}
    white-space: pre-line;
    border: 1px solid transparent;
`;

export const GUISubBox = styled.div`
    background-color: ${BackgroundColorPrimary};
    max-height: 180px;
    overflow: auto;
    ${BorderPrimary}
    border-radius: ${UiConstants.BORDER_RADIUS};
    margin: 0px;
    padding: 4px;
    ${FontFamily}

    &::-webkit-scrollbar {
        border:1px solid ${BorderColor};
        width: 24px;
    }
    
    &::-webkit-scrollbar-track {
        background: ${BorderColor};
    }

    &::-webkit-scrollbar-thumb {
        background: ${BackgroundColorElement};
        border:1px solid ${BackgroundColorPrimary};
        border-radius: ${UiConstants.BORDER_RADIUS};
    }

`;

export const GUIHeadline = styled(Heading1Base)`
    display: flex;
    flex-direction: row;
    font-size: large;
    color: ${FontColorHighlight};
    padding-bottom: 0.3em;
    padding-right: 30px;
    ${FontFamily}
`;

export const GUIHeadlineLight = styled(GUIHeadline)`
    color: ${FontColorLight};
`;

export const GUIHeadlineSuffix = styled.div`
    font-size: small;
    margin-left: 4px;
    font-weight: normal;
    ${FontFamily}
`;

export interface GUITextProps {
    color?: string;
}

export const GUITextBold = styled.div<GUITextProps>`
    font-weight: bold;
    margin-bottom: 3px;
    color: ${props => props.color ? props.color : FontColorModerate};
    ${FontFamily}
`;

export const GUITextNormal = styled.div<GUITextProps>`
    font-weight: normal;
    margin-bottom: 3px;
    color: ${props => props.color ? props.color : FontColorModerate};
    ${FontFamily}
`;

export const GUITextNormalDebug = styled.div<GUITextProps>`
    font-weight: normal;
    margin-bottom: 3px;
    color: ${props => props.color ? props.color : FontColorModerate};
    ${FontFamily}
`;

export const GUITextDebug = styled.div<GUITextProps>`
    display: flex;
    flex-direction: row;
    color: ${FontColorLowlight};
    ${FontFamilyDebug}
`;

export const GUISelectableText = styled.div<GUITextProps>`
    cursor: text;
    -webkit-user-select: all;
    -moz-user-select: all;
    -ms-user-select: all;
    user-select: all;
`;


export interface GUIMarginProps {
    left?: string;
    right?: string;
    top?: string;
    bottom?: string;
}

export const GUIMargin = styled.div<GUIMarginProps>`
    margin-left: ${props => props.left ? props.left : "0"};
    margin-right: ${props => props.right ? props.right : "0"};
    margin-top: ${props => props.top ? props.top : "0"};
    margin-bottom: ${props => props.bottom ? props.bottom : "0"};
`;

export const GUIKeyFramesFlash = keyframes`
  from {
    background-color: ${BackgroundColorSecondaryFlash};
  }

  to {
    background-color: ${BackgroundColorSecondary};
  }
`;

export const GUIButton = styled(Button)`
    color: black;
    cursor: pointer;
    ${FontFamily}
    margin-left: -10px;
    /*
    &:hover {
        div {
            border-image-source: url("assets/game/images/9slices/12_9Slice.png");
        }
    }
    */
`;

export const GUIRow = styled.div`
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    flex-shrink: 0;
`;