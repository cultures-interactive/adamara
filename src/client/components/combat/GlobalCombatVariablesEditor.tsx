import React from 'react';
import { observer } from "mobx-react-lite";
import { IntInputField } from '../shared/IntInputField';
import { FloatInputField } from '../shared/FloatInputField';
import { useTranslation } from 'react-i18next';
import { combatStore } from '../../stores/CombatStore';

export const GlobalCombatVariablesEditor: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const { config } = combatStore;

    return (
        <>
            <h1>{t("editor.combat_configuration_global_variables")}</h1>
            <table>
                <tbody>
                    <tr>
                        <td>{t("editor.combat_configuration_short_phase_duration")}:</td>
                        <td><FloatInputField value={config.shortPhaseDuration} onChange={config.setShortPhaseDuration.bind(config)} onlyPositive={true} /></td>
                    </tr>
                    <tr>
                        <td>{t("editor.combat_configuration_long_phase_duration")}:</td>
                        <td><FloatInputField value={config.longPhaseDuration} onChange={config.setLongPhaseDuration.bind(config)} onlyPositive={true} /></td>
                    </tr>
                    <tr>
                        <td>{t("editor.combat_configuration_phase_transition_duration")}:</td>
                        <td><FloatInputField value={config.phaseTransitionDuration} onChange={config.setPhaseTransitionDuration.bind(config)} onlyPositive={true} /></td>
                    </tr>
                    <tr>
                        <td>{t("editor.combat_configuration_player_health")}:</td>
                        <td><IntInputField value={config.playerHealth} onChange={config.setPlayerHealth.bind(config)} onlyPositive={true} /></td>
                    </tr>
                    <tr>
                        <td>{t("editor.combat_configuration_short_player_attack_phase_damage_multiplier")}:</td>
                        <td><FloatInputField value={config.shortPlayerAttackPhaseDamageMultiplier} onChange={config.setShortPlayerAttackPhaseDamageMultiplier.bind(config)} onlyPositive={true} /></td>
                    </tr>
                    <tr>
                        <td>{t("editor.combat_configuration_long_player_attack_phase_damage_multiplier")}:</td>
                        <td><FloatInputField value={config.longPlayerAttackPhaseDamageMultiplier} onChange={config.setLongPlayerAttackPhaseDamageMultiplier.bind(config)} onlyPositive={true} /></td>
                    </tr>
                    <tr>
                        <td>{t("editor.combat_configuration_bonus_damage")} (0..1):</td>
                        <td><FloatInputField value={config.bonusDamage} onChange={config.setBonusDamage.bind(config)} onlyPositive={true} min={0} max={1} /></td>
                    </tr>
                    <tr>
                        <td>{t("editor.combat_configuration_long_defense_phase_damage_factor")}:</td>
                        <td><FloatInputField value={config.longDefensePhaseDamageFactor} onChange={config.setLongDefensePhaseDamageFactor.bind(config)} onlyPositive={true} /></td>
                    </tr>
                </tbody>
            </table>
        </>
    );
});