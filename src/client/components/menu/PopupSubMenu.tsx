import React, { ReactNode, useEffect, useRef } from "react";
import { UiConstants } from "../../data/UiConstants";
import styled, { css } from "styled-components";
import { observer } from "mobx-react-lite";
import { MathE } from "../../../shared/helper/MathExtension";
import { useEffectOnlyWhenDependenciesChange } from "../../helper/reactHelpers";

export enum Orientation {
    Top, Right, Bottom, Left
}

export interface PopupSubMenuProps {
    disabled?: boolean;
    orientation: Orientation;
    pixelOffsetX?: number;   // X Offset in pixel
    pixelOffsetY?: number;   // Y Offset in pixel
    relativeOffset?: number; // Offset relative to popup rect on secondary axis. 1 = top/left, 0.5 = middle, 0 = right/bottom
    containerWidth?: string;
    buttonClass?: React.FunctionComponent<React.HTMLProps<HTMLButtonElement>>;
    buttonContent: JSX.Element;
    buttonInvalid?: boolean;
    childrenWithCallbacks?: (closePopup: () => void) => ReactNode;  // optional children property that can hand functions of PopupSubMenu to contents of menu
    onOpen?: () => void;
    onClose?: () => void;
    positionFixed?: boolean;
    containerHeight?: string;
}

export type PopupSubMenuExternalStateProps = PopupSubMenuProps & {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
};

export const Overlay = styled.div`
    z-index: ${UiConstants.Z_INDEX_POPUP_SUBMENU};
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
`;

export const Submenu = styled.div`
    border: 2px solid black;
    background: white;
    padding: 10px;
    height: 100%;
`;

const PopupContainer = styled.div<{ transform?: string; visible?: boolean; containerWidth?: string; containerHeight?: string; positionFixed?: boolean; left?: string; top?: string; }>`
    z-index: ${UiConstants.Z_INDEX_POPUP_SUBMENU + 1};
    position: ${props => props.positionFixed ? "fixed" : "absolute"};
    transform: ${props => props.transform ? props.transform : 'unset'};
    margin-right: ${props => props.positionFixed ? undefined : "-50%"};
    width: ${props => props.containerWidth ? props.containerWidth : '100%'};
    ${props => props.containerWidth && css`height: ${props.containerHeight}`};
    visibility: ${props => props.visible ? 'unset' : 'hidden'};
    left: ${props => props.left};
    top: ${props => props.top};
`;

export const DefaultButton = styled.button`
    cursor: pointer;
    display: flex;
    
    &.invalid {
        outline: 2px solid ${UiConstants.COLOR_VALUE_INVALID};
        border-radius: 2px;
        border-color: rgba(0, 0, 0, 0);
    }
`;

export const PopupSubMenuIconContainer = styled.div`
    margin-right: 4px;
`;

// PopupSubMenu must be an observer() because props.childrenWithCallbacks might contain observable values
export const PopupSubMenuExternalState: React.FunctionComponent<PopupSubMenuExternalStateProps> = observer((props) => {

    const { isOpen, setIsOpen } = props;

    const [transform, setTransform] = React.useState('translate(0, 0)');
    const [visible, setVisibility] = React.useState(false);
    const [left, setLeft] = React.useState<string>(undefined);
    const [top, setTop] = React.useState<string>(undefined);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const relativeOffset = props.relativeOffset !== undefined ? props.relativeOffset : 0.5;
    const pixelOffsetX = props.pixelOffsetX !== undefined ? props.pixelOffsetX : 0;
    const pixelOffsetY = props.pixelOffsetY !== undefined ? props.pixelOffsetY : 0;

    function openPopup() {
        setIsOpen(true);
    }

    function closePopup() {
        setIsOpen(false);
    }

    useEffectOnlyWhenDependenciesChange(() => {
        if (isOpen) {
            if (props.onOpen)
                props.onOpen();
        } else {
            if (props.onClose)
                props.onClose();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const popupRect = popupRef.current.getBoundingClientRect();

        if (props.positionFixed) {
            setLeft(buttonRect.x + "px");
            setTop(MathE.clamp(buttonRect.y + buttonRect.height, 0, window.innerHeight - popupRect.height) + "px");

            if (props.orientation === Orientation.Left) {
                setTransform(`translate(calc(-100% + ${pixelOffsetX}px), calc(-${relativeOffset * 100}% + ${pixelOffsetY - buttonRect.height}px))`);
            } else if (props.orientation === Orientation.Right) {
                setTransform(`translate(${pixelOffsetX + buttonRect.width}px, calc(-${relativeOffset * 100}% + ${pixelOffsetY}px))`);
            } else if (props.orientation === Orientation.Top) {
                setTransform(`translate(calc(-${relativeOffset * 100}% + ${pixelOffsetX}px), calc(-100% + ${pixelOffsetY - buttonRect.height}px))`);
            } else if (props.orientation === Orientation.Bottom) {
                setTransform(`translate(calc(-${relativeOffset * 100}% + ${pixelOffsetX}px), ${pixelOffsetY}px)`);
            }
        } else {
            setLeft(undefined);
            setTop(undefined);

            let offsetY = pixelOffsetY;
            if (props.orientation === Orientation.Left || props.orientation === Orientation.Right) {
                offsetY += (popupRect.height / 2) - (popupRect.height * relativeOffset) - (buttonRect.height / 2) + (buttonRect.height * relativeOffset);
            }
            let offsetX = pixelOffsetX;
            if (props.orientation === Orientation.Top || props.orientation === Orientation.Bottom) {
                offsetX += (popupRect.width / 2) - (popupRect.width * relativeOffset) - (buttonRect.width / 2) + (buttonRect.width * relativeOffset);
            }

            if (popupRect.width === 0) return;

            if (props.orientation === Orientation.Left) {
                setTransform(`translate(${(popupRect.width * -1) + offsetX}px, -${(popupRect.height / 2) + (buttonRect.height / 2) - offsetY}px)`);
            } else if (props.orientation === Orientation.Right) {
                setTransform(`translate(${buttonRect.width + offsetX}px, -${(popupRect.height / 2) + (buttonRect.height / 2) - offsetY}px)`);
            } else if (props.orientation === Orientation.Top) {
                setTransform(`translate(-${(popupRect.width / 2) - (buttonRect.width / 2) - offsetX}px, -${popupRect.height + buttonRect.height - offsetY}px)`);
            } else if (props.orientation === Orientation.Bottom) {
                setTransform(`translate(-${(popupRect.width / 2) - (buttonRect.width / 2) - offsetX}px, ${offsetY}px)`);
            }
        }

        setVisibility(true);

    }, [isOpen]);

    const buttonClass = {
        class: props.buttonClass || DefaultButton
    };

    return (
        <div>
            {isOpen && <Overlay onClick={closePopup}></Overlay>}

            <buttonClass.class
                disabled={props.disabled}
                onClick={openPopup}
                ref={buttonRef}
                className={props.buttonInvalid ? "invalid" : ""}
            >
                {props.buttonContent}
            </buttonClass.class>

            <PopupContainer transform={transform} visible={isOpen && visible} ref={popupRef} containerWidth={props.containerWidth} containerHeight={props.containerHeight} positionFixed={props.positionFixed} left={left} top={top}>
                {isOpen && (
                    <Submenu>
                        {props.childrenWithCallbacks ? props.childrenWithCallbacks(closePopup) : props.children}
                    </Submenu>
                )}
            </PopupContainer>
        </div>
    );
});

export const PopupSubMenu: React.FunctionComponent<PopupSubMenuProps> = (props) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <PopupSubMenuExternalState
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            {...props}
        />
    );
};