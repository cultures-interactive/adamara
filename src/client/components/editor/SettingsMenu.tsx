import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCog, FaCogs } from 'react-icons/fa';
import styled from 'styled-components';
import { UiConstants } from '../../data/UiConstants';
import { IntInputField } from '../shared/IntInputField';
import { MenuCard, MenuCardOverflowUnset } from '../menu/MenuCard';
import { MenuCardLabel } from '../menu/MenuCardLabel';
import { Overlay } from '../menu/PopupSubMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { KeyValueRow, ListEntryKey, ListEntryValue } from "../shared/KeyValueRow";
import { Input } from "./Input";
import { emptyFunctionToSuppressReactWarning } from '../../helper/reactHelpers';
import { Dropdown } from './Dropdown';
import { allEditorComplexities, localSettingsStore } from '../../stores/LocalSettingsStore';
import { MapSelector } from '../mapEditor/MapSelector';
import { EditorComplexity } from '../../../shared/definitions/other/EditorComplexity';
import { FloatInputField } from '../shared/FloatInputField';
import { anyFeatureSwitchParameterSet } from '../../data/featureSwitchConstants';
import { LogoutButton } from '../auth/LogoutButton';
import { gameStore } from '../../stores/GameStore';
import { networkDiagnosticsStore } from '../../stores/NetworkDiagnosticsStore';
import { userStore } from '../../stores/UserStore';
import { actionEditorStore } from '../../stores/ActionEditorStore';
import { editorStore } from '../../stores/EditorStore';

const MenuContainer = styled.div`
    z-index: ${UiConstants.Z_INDEX_MODAL};
    border-radius: ${UiConstants.BORDER_RADIUS};
    position: fixed;
    right: 50%;
    transform: translate(50%,0);
    top: 70px;
    background: ${UiConstants.COLOR_MENU_BACKGROUND};
`;

const MenuContent = styled.div`
    max-height: 450px;
    overflow-y: auto;
`;

const ShortListEntryKey = styled(ListEntryKey)`
    min-width: 150px;
`;

export const IconButton = styled.span`
    margin-left: 2px;
    padding-top: 2px;
    padding-bottom: 2px;
    padding-left: 6px;
    padding-right: 6px;
    border-radius: ${UiConstants.BORDER_RADIUS};
    background-color: ${UiConstants.COLOR_DARK_BUTTON};
    color: white;

    cursor: pointer;

    &:hover {
        cursor: pointer;
        background-color: ${UiConstants.COLOR_DARK_BUTTON_HOVER};
    }

    svg {
        position: relative;
        top: 2px;
    }
`;

interface ActiveTabProps {
    active: boolean;
}

const SettingsMenuTab = styled.span<ActiveTabProps>`
    margin-left: 2px;
    padding-top: 2px;
    padding-bottom: 2px;
    padding-left: 6px;
    padding-right: 6px;
    border-radius: ${UiConstants.BORDER_RADIUS};
    background-color: ${props => props.active ? UiConstants.COLOR_SELECTION_HIGHLIGHT : UiConstants.COLOR_DARK_BUTTON};
    border: ${props => props.active ? "2px solid black" : "unset"};
    color: white;
    width: min-content;

    &:hover {
        cursor: pointer;
        background-color: ${props => props.active ? UiConstants.COLOR_SELECTION_HIGHLIGHT : UiConstants.COLOR_DARK_BUTTON_HOVER};
    }

    text-decoration: none;
`;

interface NumberInputProps {
    label: string;
    value: number;
    valueSetter: (number: number) => void;
}

const NumberInput: React.FunctionComponent<NumberInputProps> = ({ label, value, valueSetter }) => {
    return (
        <tr>
            <td>{label}</td>
            <td>
                <IntInputField
                    value={value}
                    onChange={valueSetter}
                    onlyPositive={true}
                />
            </td>
        </tr>
    );
};

const FloatInput: React.FunctionComponent<NumberInputProps> = ({ label, value, valueSetter }) => {
    return (
        <tr>
            <td>{label}</td>
            <td>
                <FloatInputField
                    value={value}
                    onChange={valueSetter}
                    onlyPositive={true}
                />
            </td>
        </tr>
    );
};

interface ClientSettingsProps {
    showNonGameSettings: boolean;
}

const ClientSettings: React.FunctionComponent<ClientSettingsProps> = observer(({ showNonGameSettings }) => {
    const { t } = useTranslation();

    return (
        <MenuCard>
            <KeyValueRow>
                <ShortListEntryKey>
                    {t("editor.language")}
                </ShortListEntryKey>
                <ListEntryValue>
                    <LanguageSwitcher />
                </ListEntryValue>
            </KeyValueRow>
            <KeyValueRow onClick={() => gameStore.toggleAccessibilityOptions()}>
                <ShortListEntryKey>
                    {t("game.accessibility_options")}
                </ShortListEntryKey>
                <ListEntryValue>
                    <Input
                        type="checkbox"
                        checked={gameStore.accessibilityOptions}
                        onChange={emptyFunctionToSuppressReactWarning}
                    />
                </ListEntryValue>
            </KeyValueRow>
            <KeyValueRow onClick={() => localSettingsStore.toggleFullscreen()}>
                <ShortListEntryKey>
                    {t("editor.local_setting_toggle_fullscreen")}
                </ShortListEntryKey>
                <ListEntryValue>
                    <Input
                        type="checkbox"
                        checked={localSettingsStore.fullscreen}
                        onChange={emptyFunctionToSuppressReactWarning}
                    />
                </ListEntryValue>
            </KeyValueRow>
            {userStore.shouldShowAdvancedOptions && (<>
                <KeyValueRow onClick={() => localSettingsStore.toggleShowDebugInfoSetting()}>
                    <ShortListEntryKey>
                        {t("editor.local_setting_show_debug_info")}
                    </ShortListEntryKey>
                    <ListEntryValue>
                        <Input
                            type="checkbox"
                            checked={localSettingsStore.showDebugInfo}
                            onChange={emptyFunctionToSuppressReactWarning}
                        />
                    </ListEntryValue>
                </KeyValueRow>
                <KeyValueRow onClick={() => localSettingsStore.toggleShowPerformanceInfoSetting()}>
                    <ShortListEntryKey>
                        {t("editor.local_setting_show_performance_info")}
                    </ShortListEntryKey>
                    <ListEntryValue>
                        <Input
                            type="checkbox"
                            checked={localSettingsStore.showPerformanceInfo}
                            onChange={emptyFunctionToSuppressReactWarning}
                        />
                    </ListEntryValue>
                </KeyValueRow>
            </>)}
            {showNonGameSettings && (
                <>
                    {!actionEditorStore.treeFocussedForWorkshop && (
                        <KeyValueRow>
                            <ShortListEntryKey>
                                {t("editor.local_setting_complexity")}
                            </ShortListEntryKey>
                            <ListEntryValue>
                                <Dropdown
                                    value={localSettingsStore.editorComplexity}
                                    onChange={(e => localSettingsStore.setEditorComplexity(+e.target.value as EditorComplexity))}
                                >
                                    {allEditorComplexities.map(complexity => (
                                        <option
                                            key={complexity}
                                            value={complexity}
                                        >
                                            {t("editor.local_setting_complexity_" + complexity)}
                                        </option>
                                    ))}
                                </Dropdown>
                            </ListEntryValue>
                        </KeyValueRow>
                    )}
                    {userStore.shouldShowAdvancedOptions && (<>
                        <KeyValueRow onClick={localSettingsStore.toggleActionTreeValidationEnabled}>
                            <ShortListEntryKey>
                                {t("editor.action_tree_validation")}
                            </ShortListEntryKey>
                            <ListEntryValue>
                                <Input
                                    type={"checkbox"}
                                    checked={localSettingsStore.actionTreeValidationEnabled}
                                    onChange={emptyFunctionToSuppressReactWarning}
                                />
                            </ListEntryValue>
                        </KeyValueRow>
                        <KeyValueRow onClick={localSettingsStore.toggleShowUndoHistoryDebug}>
                            <ShortListEntryKey>
                                {t("editor.local_setting_show_undo_history_debug")}
                            </ShortListEntryKey>
                            <ListEntryValue>
                                <Input
                                    type="checkbox"
                                    checked={localSettingsStore.showUndoHistoryDebug}
                                    onChange={emptyFunctionToSuppressReactWarning}
                                />
                            </ListEntryValue>
                        </KeyValueRow>
                    </>)}
                </>
            )}
            {userStore.isLoggedIn && (
                <KeyValueRow>
                    <LogoutButton />
                </KeyValueRow>
            )}
            <KeyValueRow>
                <button onClick={() => networkDiagnosticsStore.setShowBecauseOfUserRequest(true)}>
                    {t("editor.network_diagnostics")}
                </button>
            </KeyValueRow>
        </MenuCard >
    );
});

const ServerSettings: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const newReputationActBalance = (act: number, value: number) => {
        const newActBalance = gameStore.gameDesignVariables.reputationActBalance.slice();
        newActBalance[act - 1] = value;
        gameStore.gameDesignVariables.setReputationActBalance(newActBalance);
    };

    return (
        <MenuCard>
            <MenuCardLabel>{t("editor.game_design_variable_general")}</MenuCardLabel>
            <table>
                <tbody>
                    <tr>
                        <td>{t("editor.game_design_variable_game_starting_map")}</td>
                        <td>
                            <MapSelector
                                selectedMapId={gameStore.gameDesignVariables.gameStartingMapId}
                                onSelected={mapId => gameStore.gameDesignVariables.setGameStartingMapId(mapId)}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
            <MenuCardLabel>{t("action_editor.property_reputation")}</MenuCardLabel>
            <table>
                <tbody>
                    <NumberInput label={t("editor.game_design_variable_reputation_balance_factor")} value={gameStore.gameDesignVariables.reputationBalanceFactor} valueSetter={value => gameStore.gameDesignVariables.setReputationBalanceFactor(value)} />
                    <NumberInput label={t("editor.game_design_variable_reputation_change_small")} value={gameStore.gameDesignVariables.reputationAmountBalance.Small} valueSetter={value => gameStore.gameDesignVariables.reputationAmountBalance.setSmall(value)} />
                    <NumberInput label={t("editor.game_design_variable_reputation_change_reasonable")} value={gameStore.gameDesignVariables.reputationAmountBalance.Reasonable} valueSetter={value => gameStore.gameDesignVariables.reputationAmountBalance.setReasonable(value)} />
                    <NumberInput label={t("editor.game_design_variable_reputation_change_large")} value={gameStore.gameDesignVariables.reputationAmountBalance.Large} valueSetter={value => gameStore.gameDesignVariables.reputationAmountBalance.setLarge(value)} />
                    <FloatInput label={t("editor.game_design_variable_reputation_balance_in_act", { number: 1 })} value={gameStore.gameDesignVariables.reputationActBalance[0]} valueSetter={value => newReputationActBalance(1, value)} />
                    <FloatInput label={t("editor.game_design_variable_reputation_balance_in_act", { number: 2 })} value={gameStore.gameDesignVariables.reputationActBalance[1]} valueSetter={value => newReputationActBalance(2, value)} />
                    <FloatInput label={t("editor.game_design_variable_reputation_balance_in_act", { number: 3 })} value={gameStore.gameDesignVariables.reputationActBalance[2]} valueSetter={value => newReputationActBalance(3, value)} />
                    <FloatInput label={t("editor.game_design_variable_reputation_balance_in_act", { number: 4 })} value={gameStore.gameDesignVariables.reputationActBalance[3]} valueSetter={value => newReputationActBalance(4, value)} />
                    <FloatInput label={t("editor.game_design_variable_reputation_balance_in_act", { number: 5 })} value={gameStore.gameDesignVariables.reputationActBalance[4]} valueSetter={value => newReputationActBalance(5, value)} />
                </tbody>
            </table>
        </MenuCard>
    );
});

interface SettingsMenuProps {
    showNonGameSettings: boolean;
}

export const SettingsMenu: React.FunctionComponent<SettingsMenuProps> = ({ showNonGameSettings }) => {
    const { t } = useTranslation();
    const [menuTab, setMenuTab] = useState("client");
    const [menuOpen, setMenuOpen] = useState(false);

    const showServerSettings = showNonGameSettings && editorStore.isMainGameEditor;

    return (
        <>
            <IconButton onClick={() => setMenuOpen(true)}>{anyFeatureSwitchParameterSet ? <FaCogs /> : <FaCog />}</IconButton>
            {menuOpen && <>
                <Overlay onClick={() => setMenuOpen(false)} />
                <MenuContainer>
                    {/* <CloseButton><RiCloseLine onClick={() => setMenuOpen(false)} /></CloseButton> */}
                    {showServerSettings && (
                        <MenuCardOverflowUnset>
                            <SettingsMenuTab active={menuTab === "client"} onClick={() => setMenuTab("client")}>
                                {t("editor.client_settings")}
                            </SettingsMenuTab>
                            <SettingsMenuTab active={menuTab === "server"} onClick={() => setMenuTab("server")}>
                                {t("editor.server_settings")}
                            </SettingsMenuTab>
                        </MenuCardOverflowUnset>
                    )}
                    <MenuContent>
                        {(menuTab === "client" || !showServerSettings) && <ClientSettings showNonGameSettings={showNonGameSettings} />}
                        {(menuTab === "server" && showServerSettings) && <ServerSettings />}
                    </MenuContent>
                </MenuContainer>
            </>
            }
        </>
    );
};