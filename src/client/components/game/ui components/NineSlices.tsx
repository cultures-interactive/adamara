import { prop } from "mobx-keystone";
import React from "react";
import styled from "styled-components";

const imageScale = 0.5;

function makeNineSliceImageDiv(image: string, leftWidth: number, rightWidth: number, topHeight: number, bottomHeight: number, borderOffset: number) {
    return styled.div`
        position: absolute;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        border: 0px solid white;
        border-left-width: ${leftWidth * imageScale + borderOffset}px;
        border-right-width: ${rightWidth * imageScale + borderOffset}px;
        border-top-width: ${topHeight * imageScale + borderOffset}px;
        border-bottom-width: ${bottomHeight * imageScale + borderOffset}px;
        border-image-source: url("${image}");
        border-image-slice: ${topHeight} ${rightWidth} ${bottomHeight} ${leftWidth} fill;
    `;
}

interface MarginProps {
    marginLeft: number;
    marginRight: number;
    marginTop: number;
    marginBottom: number;
}

const NiceSliceContainer = styled.div<MarginProps>`
    position: relative;
    overflow: hidden;
    margin: ${({ marginLeft, marginRight, marginTop, marginBottom }) => `${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px`};
`;

type NineSliceContentProps = MarginProps & {
    minWidth: number;
};

const NineSliceContent = styled.div<NineSliceContentProps>`
    position: relative;
    margin: ${({ marginLeft, marginRight, marginTop, marginBottom }) => `${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px`};
    min-width: ${props => props.minWidth ? (props.minWidth + "px") : undefined};
`;

function makeNineSlice(imageNumber: string, leftWidth: number, rightWidth: number, topHeight: number, bottomHeight: number, marginOffsetLeft: number, marginOffsetRight: number, marginOffsetTop: number, marginOffsetBottom: number, outerMarginOffsetLeft: number, outerMarginOffsetRight: number, outerMarginOffsetTop: number, outerMarginOffsetBottom: number, minWidth?: number) {
    const image = `assets/game/images/9slices/${imageNumber}_9Slice.png`;

    const BackgroundLayer = makeNineSliceImageDiv(image, leftWidth, rightWidth, topHeight, bottomHeight, 1);
    const ForegroundLayer = makeNineSliceImageDiv(image, leftWidth, rightWidth, topHeight, bottomHeight, 0);

    const component: React.FunctionComponent<{ className?: string; }> = ({ children, className }) => {
        return (
            <NiceSliceContainer
                className={className}
                marginLeft={outerMarginOffsetLeft}
                marginRight={outerMarginOffsetRight}
                marginTop={outerMarginOffsetTop}
                marginBottom={outerMarginOffsetBottom}
            >
                <BackgroundLayer />
                <ForegroundLayer />
                <NineSliceContent
                    marginLeft={leftWidth * imageScale + marginOffsetLeft}
                    marginRight={rightWidth * imageScale + marginOffsetRight}
                    marginTop={topHeight * imageScale + marginOffsetTop}
                    marginBottom={bottomHeight * imageScale + marginOffsetBottom}
                    minWidth={minWidth}
                >
                    {children}
                </NineSliceContent>
            </NiceSliceContainer>
        );
    };

    return component;
}

const NineSlice0 = makeNineSlice("00", 133, 133, 112, 44, -30, -30, -10, 5, 0, 0, 0, 0, 61);
//const NineSlice1 = makeNineSlice("01", 125, 125, 125, 125, 0, 0, 0, 0, 0, 0, 0, 0);
const NineSlice2 = makeNineSlice("02", 75, 75, 75, 75, -10, -10, -8, -8, 0, 0, 0, 0);
const NineSlice3 = makeNineSlice("03", 55, 55, 55, 55, 0, 0, 0, 0, 0, 0, 0, 0);
const NineSlice4 = makeNineSlice("04", 55, 55, 55, 55, 0, 0, 0, 0, 0, 0, 0, 0);
const NineSlice5 = makeNineSlice("05", 125, 125, 125, 125, -22, -22, -12, -12, 0, 0, 0, 0);
//const NineSlice6 = makeNineSlice("06", 125, 125, 125, 125, 0, 0, 0, 0, 0, 0, 0, 0);
const NineSlice7 = makeNineSlice("07", 125, 125, 125, 125, -28, -28, -15, -15, -8, -8, -8, -8);
const NineSlice8 = makeNineSlice("08", 125, 125, 125, 125, -22, -22, -12, -12, 0, 0, 0, 0);
//const NineSlice9 = makeNineSlice("09", 125, 125, 125, 125, -22, -22, -12, -12, 0, 0, 0, 0);
const NineSlice10 = makeNineSlice("10", 50, 50, 60, 60, 0, 0, -7, 0, 0, 0, 0, 0);
const NineSlice11 = makeNineSlice("11", 88, 88, 128, 54, -15, -15, 0, 0, 0, 0, 0, 0);
//const NineSlice12 = makeNineSlice("12", 90, 90, 130, 50, 0, 0, 0, 0, 0, 0, 0, 0);

export const TimerWindow = NineSlice0;
export const InventoryWindow = NineSlice7;
export const QuestWindow = NineSlice7;
export const NotificationWindow = NineSlice7;
export const DialogueSpeakerWindow = NineSlice4;
export const DialogueTextWindow = NineSlice5;
export const DialogueTextWindowWithoutSpeaker = NineSlice8;
export const DialogueAnswerWindow = NineSlice2;
export const TextActionWindow = NineSlice3;
export const Button = NineSlice10;
//const ButtonPressed = NineSlice12;
export const NotificationNineSlice = NineSlice11;