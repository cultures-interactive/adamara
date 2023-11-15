import React, { useEffect, useState } from 'react';
import { BiExpand } from "react-icons/bi";
import { RiCloseLine } from "react-icons/ri";
import styled, { css } from "styled-components";
import { UiConstants } from "../../data/UiConstants";
import { dataConstants } from "../../../shared/data/dataConstants";
import { localStorageGetNumber, localStorageSetNumber } from '../../integration/localStorage';

export enum Adjustment {
    Top, Right, Bottom, Left
}

export enum State {
    Expanded, Collapsed, NotSet
}

interface SlideMenuProperties {
    orientation: Adjustment;
    start: number | string;
    width?: number | string;
    height?: number | string;
    maxWidth?: number | string;
    maxHeight?: number | string;
    icon?: JSX.Element;
    iconStart?: number;
    state: State;
    ignorePersistedExpansionState?: boolean;
    collapsible: boolean;
    identifier: string;
    openMenuTriggerValue?: number;
    menuOverflow?: string;
    containerOverflow?: string;
    contentHeight?: string;
    menuBackgroundColor?: string;
    onUserToggle?: (state: State) => void;
    renderEvenWhenClosed?: boolean;
    notAnimated?: boolean;
    zIndex?: number;
    transparent?: boolean;
    closeButtonOffsetX?: number;
    closeButtonOffsetY?: number;
}

interface ContainerStyleInterface {
    zIndex: number;
    top: string;
    bottom: string;
    left: string;
    right: string;
    width: string;
    height: string;
    maxWidth: string;
    maxHeight: string;
    overflow: string;
    animated: boolean;
}

const Container = styled.div.attrs((props: ContainerStyleInterface) => props)`
    z-index: ${(props) => props.zIndex};
    right: ${(props) => props.right};
    left: ${(props) => props.left};
    top: ${(props) => props.top};
    bottom: ${(props) => props.bottom};
    width: ${(props) => props.width};
    height: ${(props) => props.height};
    max-width: ${(props) => props.maxWidth};
    max-height: ${(props) => props.maxHeight};
    overflow: ${(props) => props.overflow};
    position: absolute;
    ${(props) => props.animated && css`transition: 250ms;`}
`;

const Button = styled.div.attrs((props: { floating: string; }) => props)`
    background-color: #FFFFFF;
    text-align: center;
    &:hover {
      color: grey;
      cursor: pointer;
    }
    &.hidden {
        display: none;
    }
`;

const OpenButton = styled(Button)`
    height: ${UiConstants.SIZE_SLIDE_MENU_ICON};
    width: ${UiConstants.SIZE_SLIDE_MENU_ICON};
    font-size: ${UiConstants.SIZE_SLIDE_MENU_ICON_FONT};
    border-radius: ${UiConstants.BORDER_RADIUS};
    border: solid 2px black;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
`;

interface CloseButtonProps {
    offsetX: number;
    offsetY: number;
}

const CloseButton = styled(Button) <CloseButtonProps>`
    z-index: 20000;
    height: ${UiConstants.SIZE_SLIDE_MENU_CLOSE_ICON};
    width: ${UiConstants.SIZE_SLIDE_MENU_CLOSE_ICON};
    font-size: ${UiConstants.SIZE_SLIDE_MENU_CLOSE_ICON_FONT};
    position: absolute;
    margin-top: -1px;
    border-bottom-left-radius: ${UiConstants.BORDER_RADIUS};
    border-top-right-radius: ${UiConstants.BORDER_RADIUS};
    border: 1px solid black;
    top: ${props => props.offsetY || 0}px;
    right: ${props => props.offsetX || 0}px;
    background: #F7E400;
`;

interface MenuStyleInterface {
    width: string;
    height: string;
    overflow: string;
    backgroundColor?: string;
    transparent: boolean;
}

export const Menu = styled.div.attrs((props: MenuStyleInterface) => props)`
    width: ${(props) => props.width};
    height: ${(props) => props.height};
    display: none;
    ${props => !props.transparent && css`
        background: ${props.backgroundColor ? props.backgroundColor : dataConstants.isDevelopment ? '#CCCCDF' : '#E4E2D5'};
        border: solid 1px #274237;
        border-radius: ${UiConstants.BORDER_RADIUS};
    `}
    overflow-y: ${(props) => props.overflow};
    overflow-x: ${(props) => props.overflow};
    &.expanded {
        display: block; 
    }
`;

interface ContentStyleInterface {
    height?: string;
}

const Content = styled.div<ContentStyleInterface>`
    margin: 2px;
    height: ${props => props.height};
`;

function rawInputToCSS(input: string | number) {
    if ((input === undefined) || (input === null))
        return "";

    if (typeof (input) === "number")
        return input + "px";

    return input;
}

export const SlideMenu: React.FunctionComponent<SlideMenuProperties> = (props) => {
    const usePersistence = !props.ignorePersistedExpansionState && props.collapsible;
    const storageKey = "slideMenu_" + props.identifier;
    const defaultState = usePersistence ? localStorageGetNumber(storageKey, props.state) : props.state;
    const [state, setState] = useState(defaultState);

    const expanded = !props.collapsible || state === State.Expanded;

    const onUserToggle = () => {
        const stateNow = expanded ? State.Collapsed : State.Expanded;

        setState(stateNow);

        if (usePersistence) {
            localStorageSetNumber(storageKey, stateNow);
        }

        if (props.onUserToggle) {
            props.onUserToggle(stateNow);
        }
    };

    const containerWidth = expanded ? rawInputToCSS(props.width) : UiConstants.SIZE_SLIDE_MENU_ICON;
    const containerHeight = expanded ? rawInputToCSS(props.height) : UiConstants.SIZE_SLIDE_MENU_ICON;
    const containerMaxWidth = expanded ? rawInputToCSS(props.maxWidth) : undefined;
    const containerMaxHeight = expanded ? rawInputToCSS(props.maxHeight) : undefined;
    const containerOverflow = props.containerOverflow ?? ((containerMaxWidth || containerMaxHeight) ? "auto" : undefined);
    const icon = props.icon ?? <BiExpand />;
    const isVerticalMenu = props.orientation == Adjustment.Left || props.orientation == Adjustment.Right;

    let start = props.start;

    if (!start) {
        start = 0;
    }

    if (typeof (start) === "number") {
        start = start + "px";
    }

    if (!expanded && (props.iconStart !== undefined)) {
        start = props.iconStart + "px";
    }

    let containerTop: string;
    let containerBottom: string;
    let containerLeft: string;
    let containerRight: string;

    if (isVerticalMenu) {
        containerTop = start;
        containerLeft = (props.orientation == Adjustment.Right) ? "" : "0px";
        containerRight = (props.orientation == Adjustment.Right) ? "0px" : "";
    } else {
        containerLeft = start;
        containerTop = (props.orientation == Adjustment.Bottom) ? "" : "0px";
        containerBottom = (props.orientation == Adjustment.Bottom) ? "0px" : "";
    }

    const menuOverflow = props.menuOverflow || "auto";

    useEffect(() => {
        if (props.openMenuTriggerValue) setState(State.Expanded);
    }, [props.openMenuTriggerValue]);

    const { zIndex } = props;

    return (
        <Container
            zIndex={(zIndex === undefined) ? UiConstants.Z_INDEX_SLIDE_MENU : zIndex}
            top={containerTop}
            left={containerLeft}
            right={containerRight}
            bottom={containerBottom}
            width={containerWidth}
            height={containerHeight}
            maxWidth={containerMaxWidth}
            maxHeight={containerMaxHeight}
            overflow={containerOverflow}
            animated={!props.notAnimated}
        >
            <OpenButton className={expanded ? 'hidden' : ''} onClick={onUserToggle}>
                {icon}
            </OpenButton>
            {(expanded || props.renderEvenWhenClosed) && (
                <Menu
                    className={expanded ? 'expanded' : ''}
                    height={"100%"} width={"100%"}
                    overflow={menuOverflow}
                    backgroundColor={props.menuBackgroundColor}
                    transparent={props.transparent}
                >
                    {
                        props.collapsible &&
                        <CloseButton
                            offsetX={props.closeButtonOffsetX}
                            offsetY={props.closeButtonOffsetY}
                        >
                            <RiCloseLine onClick={onUserToggle} />
                        </CloseButton>
                    }
                    <Content height={props.contentHeight}>
                        {props.children}
                    </Content>
                </Menu>
            )}
        </Container>
    );
};
