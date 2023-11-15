import React from "react";
import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";
import ReactSlider from "react-slider";

export const Slider = styled(ReactSlider)`
    width: 100%;
    height: 20px;
`;

const StyledThumb = styled.div`
    height: 20px;
    width: 20px;
    background: ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
    color: #fff;
    border-radius: 50%;
    cursor: grab;
`;

const StyledTrack = styled.div`
    top: 0;
    bottom: 0;
    background: ${UiConstants.COLOR_DARK_BUTTON};
    border-radius: 999px;
`;

export const SliderTrack = (props: any, state: any) => <StyledTrack {...props} index={state.index} />;
export const SliderThumb = (props: any) => <StyledThumb {...props} />;