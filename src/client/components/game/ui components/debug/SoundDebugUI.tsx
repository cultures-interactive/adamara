import React from "react";
import { GUIBox } from "../GameUIElements";
import styled from "styled-components";
import { SoundSourceDebugUI } from "./SoundSourceDebugUI";
import { SoundInstanceDebugUI } from "./SoundInstanceDebugUI";

const FixedHeightGUIBox = styled(GUIBox)`
    height: 570px;
    width: 300px;
`;

const FlexRow = styled.div`
    display: flex;
    flex-direction: column;
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    margin: 2px;
`;

export const SoundDebugInfoUI: React.FunctionComponent = () => {
    return (
        <FixedHeightGUIBox>
            <FlexRow>
                <Section style={{ flexBasis: "200px" }}>
                    <SoundSourceDebugUI />
                </Section>
                <Section style={{ flexBasis: "200px" }}>
                    <SoundInstanceDebugUI />
                </Section>
            </FlexRow>
        </FixedHeightGUIBox>
    );
};