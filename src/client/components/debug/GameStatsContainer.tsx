import { observer } from "mobx-react-lite";
import React from "react";
import styled from "styled-components";
import { gameStats } from "../../integration/GameStatsIntegration";
import { localSettingsStore } from "../../stores/LocalSettingsStore";

const Container = styled.div`
    position: absolute;
    top: 110px;
    left: 30px;
    pointer-events: none;

    div {
        position: relative !important;
    }
`;

export const GameStatsContainer: React.FunctionComponent = observer(() => {
    if (!localSettingsStore.showPerformanceInfo)
        return null;

    return (
        <Container ref={ref => {
            if (ref) {
                gameStats.addGameStatsToDom(ref);
            } else {
                gameStats.removeGameStatsFromDom();
            }
        }} />
    );
});