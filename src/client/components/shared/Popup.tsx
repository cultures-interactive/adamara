import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { } from "react";
import styled, { CSSProperties } from "styled-components";

const Overlay = styled.div`
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
`;

export const CenterContainer = styled.div`
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const PopupContainer = styled.div`
    position: fixed;
    border: 3px solid black;
    background: white;
    padding: 1.3em;

`;

const Content = styled.div`
    overflow-y: auto;
    height: 100%;
    max-height: calc(100vh - 5em);
`;

const ExitButtonContainer = styled.div`
    position: absolute;
    top: 0;
    right: 0.2em;
`;

export const PopupHeadline = styled.h1`
    margin-top: 0;
`;

interface Props {
    zIndex: number;
    closePopup: () => void;
    windowStyle?: CSSProperties;
}

export const Popup: React.FunctionComponent<Props> = ({ zIndex, closePopup, children, windowStyle }) => {
    return (
        <>
            <Overlay onClick={closePopup} style={{ zIndex }}></Overlay>

            <CenterContainer>
                <PopupContainer style={{ zIndex: zIndex + 1, ...windowStyle }}>
                    <ExitButtonContainer>
                        <FontAwesomeIcon icon={faTimes} onClick={closePopup} size="2x" />
                    </ExitButtonContainer>
                    <Content>
                        {children}
                    </Content>
                </PopupContainer>
            </CenterContainer>
        </>
    );
};
