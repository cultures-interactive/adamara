import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { SetReputationStatusActionModel } from '../../../../shared/action/ActionModel';
import { MathE } from '../../../../shared/helper/MathExtension';
import { gameStore } from '../../../stores/GameStore';

const center = 1280 / 2;
const backgroundWidth = 606;
const indicatorWidth = 23;
const barLength = 392;

const ReputationIndicatorBackground = styled.img`
    position: absolute;
    top: 0px;
    left: ${center - backgroundWidth / 2}px;
    pointer-events: none;
`;

const ReputationIndicator = styled.img`
    z-index: 1;
    position: absolute;
    top: 14px;
    transition-property: top right;
    transition-duration: 2s;
    pointer-events: none;
`;

const labelDistanceX = "878px";
const labelDistanceFromTop = "1px";

const Label = styled.div`
    position: absolute;
    top: ${labelDistanceFromTop};
    pointer-events: none;
    font-size: 85%;
`;

const WindChasersLabel = styled(Label)`
    left: ${labelDistanceX};
    transform: translateX(-50%);
`;

const SilverAnchorsLabel = styled(Label)`
    right: ${labelDistanceX};
    transform: translateX(50%);
`;

const ReputationRank = styled.div`
    position: absolute;
    top: 34px;
    left: 0px;
    right: 0px;
    text-align: center;
    pointer-events: none;
    font-size: 70%;
`;

export const ReputationIndicatorUI: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const { gameState } = gameStore.gameEngine;

    const reputationStatus = (gameStore.gameEngine.getCachedActionNode(gameState.playerReputationStatus) as SetReputationStatusActionModel)?.status;

    console.log(gameState.playerReputationSilverAnchors, gameState.playerReputationWindChasers);

    const pos = MathE.clamp((gameState.playerReputationSilverAnchors - gameState.playerReputationWindChasers) / 85, -1, 1);
    const left = (center - indicatorWidth / 2 + pos * (barLength / 2)) + "px";

    return (<>
        <ReputationIndicator
            src="assets/game/images/UI/reputation_marker.png"
            style={{ left }}
        />
        <ReputationIndicatorBackground src="assets/game/images/UI/reputation_background.png" />
        <WindChasersLabel>Windchaser</WindChasersLabel>
        <SilverAnchorsLabel>Silver Anchors</SilverAnchorsLabel>
        <ReputationRank>
            {
                reputationStatus
                    ? reputationStatus.get(gameStore.languageKey)
                    : t("content.reputation_rank_newcomer")
            }
        </ReputationRank>
    </>);
});