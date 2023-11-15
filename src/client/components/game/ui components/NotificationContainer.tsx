import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled, { keyframes } from "styled-components";
import { NOTIFICATION_HEIGHT, NOTIFICATION_LIFETIME_MS, NOTIFICATION_WIDTH, notificationController, NotificationInfo } from "./NotificationController";
import { IoClose } from "react-icons/io5";
import { FontFamily } from "./GameUIElements";
import { DialogueParser } from "../DialogueParser";
import { findDialogSpeaker, getTextOfAction } from "../../../helper/gameActionTreeHelper";
import { gameStore } from "../../../stores/GameStore";
import { Heading1Base } from "../../shared/Heading";
import { NotificationNineSlice } from "./NineSlices";

export const countdownKeyFrames = keyframes`
    from {
        stroke-dashoffset: 0px;
    }
    to {
        stroke-dashoffset: ${NOTIFICATION_HEIGHT / 100 * 226}px;
    }
`;

const StyledSvg = styled.svg`
    width: ${NOTIFICATION_HEIGHT}px;
    height: ${NOTIFICATION_HEIGHT}px;
    transform: rotateY(-180deg) rotateZ(-90deg);
`;

const StyledCircle = styled.circle`
    stroke-dasharray: ${NOTIFICATION_HEIGHT / 100 * 226}px;
    stroke-dashoffset: 0px;
    stroke-linecap: unset;
    stroke-width:  ${NOTIFICATION_HEIGHT / 100 * 6 * 3 + 4}px;
    stroke: #CFD4DE;
    fill: none;
    animation: ${countdownKeyFrames} ${NOTIFICATION_LIFETIME_MS}ms linear forwards;
`;

const Container = styled.div`
    position: absolute;
    display: flex;
    flex-direction: row;
    height: ${NOTIFICATION_HEIGHT}px;
    right: 10px;
    ${FontFamily}
`;

const ContentContainer = styled(NotificationNineSlice)`
    position: relative;
    top: -17px;
    height: ${NOTIFICATION_HEIGHT + 25}px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    flex-grow: 1;
    transform: translateX(${NOTIFICATION_HEIGHT / 2}px);
    width: ${NOTIFICATION_WIDTH - (NOTIFICATION_HEIGHT / 2)}px;
    padding-left: 4px;
    padding-top: 4px;
    padding-bottom: 4px;
    padding-right: ${NOTIFICATION_HEIGHT / 2}px;
`;

const CountdownContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #565C6E;
    position: relative;
    margin: auto;
    height: ${NOTIFICATION_HEIGHT}px;
    width: ${NOTIFICATION_HEIGHT}px;
    text-align: center;
    border-radius: ${NOTIFICATION_HEIGHT / 2}px;
    border: solid black 3px;
`;

const CloseIcon = styled.div`
    position: absolute;
    cursor: pointer;

    img {
        position: absolute;
        transform: translate(-50%, -50%);
    }
`;

const Title = styled(Heading1Base)`
    font-size: 85%;
    position: absolute;
    top: -36px;
    left: 17px;
    white-space: nowrap;
`;

const Text = styled.div`
    font-size: 78%;
    color: #CFD4DE
`;

interface Props {
    info: NotificationInfo;
}

export const NotificationContainer: React.FunctionComponent<Props> = observer((props) => {
    const { t } = useTranslation();

    return (
        <Container
            style={{
                top: `${props.info.topDistance}px`,
                transition: `top ${props.info.topDistance}ms cubic-bezier(.67,.86,.77,1.15)`
            }}
            onClick={_ => notificationController.removeNotification(props.info.id)}
        >
            <ContentContainer>
                <Title>
                    <DialogueParser
                        dialogueString={findDialogSpeaker(props.info.action, gameStore.gameEngine.rootActionTree, t)}
                        initialTreeScopeContext={props.info.action}
                    />
                </Title>
                <Text>
                    <DialogueParser
                        dialogueString={getTextOfAction(props.info.action, props.info.extraInformation, t)}
                        initialTreeScopeContext={props.info.action}
                    />
                </Text>

            </ContentContainer>

            <CountdownContainer>
                <StyledSvg>
                    <StyledCircle
                        r={NOTIFICATION_HEIGHT / 100 * 36}
                        cx={NOTIFICATION_HEIGHT / 100 * 50 - 3}
                        cy={NOTIFICATION_HEIGHT / 100 * 50}
                    />
                </StyledSvg>
                <CloseIcon>
                    <img src="assets/game/images/UI/x-button_yellow.png" />
                    <img src="assets/game/images/UI/x_button_x.png" />
                </CloseIcon>
            </CountdownContainer>

        </Container>
    );
});
