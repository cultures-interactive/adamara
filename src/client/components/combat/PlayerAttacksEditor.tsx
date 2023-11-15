import React from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { FloatInputField } from '../shared/FloatInputField';
import { useTranslation } from 'react-i18next';
import { PlayerAttackModel } from '../../../shared/combat/PlayerAttackModel';
import { GesturePatternEditor } from './GesturePatternEditor';
import { combatStore } from '../../stores/CombatStore';

const PlayerAttackContainer = styled.div`
    border-left: 1px solid black;
    margin-left: 1em;
    padding-left: 1em;
    margin-top: 0.5em;
    margin-bottom: 2em;
`;

interface PlayerAttackProps {
    playerAttack: PlayerAttackModel;
}

const PlayerAttack: React.FunctionComponent<PlayerAttackProps> = observer(({ playerAttack }) => {
    const { t } = useTranslation();

    return (
        <div>
            <div>{playerAttack.name}</div>
            <PlayerAttackContainer>
                <table>
                    <tbody>
                        {/*
                        <tr>
                            <td>{t("editor.combat_configuration_player_attack_name")}:</td>
                            <td><input value={playerAttack.name} onChange={e => playerAttack.setName(e.target.value)} /></td>
                        </tr>
                        */}
                        <tr>
                            <td>{t("editor.combat_configuration_player_attack_damage")}:</td>
                            <td><FloatInputField value={playerAttack.damage} onChange={playerAttack.setDamage.bind(playerAttack)} onlyPositive={true} /></td>
                        </tr>
                        <tr>
                            <td>{t("editor.combat_configuration_player_attack_cooldown")}:</td>
                            <td><FloatInputField value={playerAttack.cooldown} onChange={playerAttack.setCooldown.bind(playerAttack)} onlyPositive={true} /></td>
                        </tr>
                        <tr>
                            <td>{t("editor.combat_configuration_player_attack_hit_animation_duration")}:</td>
                            <td><FloatInputField value={playerAttack.hitAnimationDuration} onChange={playerAttack.setHitAnimationDuration.bind(playerAttack)} onlyPositive={true} /></td>
                        </tr>
                        <tr>
                            <td>{t("editor.combat_configuration_gesture_pattern")}:</td>
                            <td>
                                <GesturePatternEditor gesturePattern={playerAttack.pattern} isGlobalPattern={false} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </PlayerAttackContainer>
        </div>
    );
});

export const PlayerAttacksEditor: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const { playerAttacks } = combatStore.config;

    return (
        <div>
            <h1>{t("editor.combat_configuration_player_attacks")}</h1>
            {playerAttacks.map(playerAttack => <PlayerAttack key={playerAttack.$modelId} playerAttack={playerAttack} />)}
        </div>
    );
});