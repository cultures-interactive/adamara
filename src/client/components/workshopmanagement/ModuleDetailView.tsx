import React from "react";
import styled from "styled-components";
import { Input } from "../shared/Input";
import { MenuCard } from "../menu/MenuCard";
import { observer } from "mobx-react-lite";
import { managementStore } from "../../stores/ManagementStore";
import { Dropdown } from "../editor/Dropdown";
import { useTranslation } from "react-i18next";
import { EditorComplexity } from "../../../shared/definitions/other/EditorComplexity";
import { allEditorComplexities } from "../../stores/LocalSettingsStore";
import { useHistory } from "react-router";
import { openProductionEditor } from "./WorkshopHelper";
import { AccessCode } from "./AccessCode";
import { moduleParticipantAccessCodeConfig, standaloneModulePlayCodeConfig } from "../../../shared/helper/accesscodeHelpers";
import { HiOutlineRefresh } from "react-icons/hi";
import { managementClient } from "../../communication/ManagementClient";
import { getPublicGameVariantLink } from "../../data/routes";

const PropertyView = styled(MenuCard)`
    grid-column-start: 2;
`;

const PropertyContainer = styled.table`
    background: white;
    padding: 3px;
    margin: 3px;

    th {
        min-width: 130px;
        font-weight: normal;
        vertical-align: top;
        padding: 5px 0px;
    }
`;

const ErrorText = styled.div`
    color: red;
`;

const MapSelectorDropdown = styled(Dropdown)`
    max-width: 310px;  
`;

interface ItemEditProps {
    editItem: string;
}

export const ModuleDetailView: React.FunctionComponent<ItemEditProps> = observer((props) => {
    const { t } = useTranslation();
    const history = useHistory();

    const selectedModule = managementStore.getModule(props.editItem);

    function updateName(newName: string) {
        selectedModule.setName(newName);
    }

    function updateDescription(newDescription: string) {
        selectedModule.setDescription(newDescription);
    }

    function updateStartDate(newStartDate: string) {
        selectedModule.setStartDate(HTMLDateValueToDateObject(newStartDate));
    }

    function updateEndDate(newEndDate: string) {
        selectedModule.setEndDate(HTMLDateValueToDateObject(newEndDate));
    }

    function updateStartAct(newStartAct: number) {
        selectedModule.setStartAtAct(newStartAct);
    }

    function toggleIsStandaloneModule() {
        selectedModule.setIsStandalone(!selectedModule.isStandalone);
    }

    function updateStandaloneModuleStartMapId(newStandaloneMapId: number) {
        selectedModule.setStandaloneMapId(newStandaloneMapId);
    }

    function HTMLDateValueToDateObject(dateString: string) {
        if (dateString.length == 0)
            return 0;
        return new Date(dateString).getTime();
    }

    function dateObjectToHTMLDateInputValue(dateNumber: number) {
        if (!dateNumber)
            return undefined;
        return new Date(dateNumber).toISOString().split('T')[0];
    }

    async function openModuleInEditor(moduleId: string) {
        openProductionEditor(history, moduleId);
    }

    const hasStartAndEndDate = Boolean(selectedModule.startDate && selectedModule.endDate);
    const moduleMapList = managementStore.getModuleMapList(selectedModule.$modelId);

    return (<>
        {selectedModule && <PropertyView>
            <PropertyContainer>
                <tbody>
                    <tr>
                        <th>{t("management.module_name")}</th>
                        <td>
                            <Input value={selectedModule.name} onChange={({ target }) => updateName(target.value)} />
                        </td>
                    </tr>
                    <tr>
                        <th>{t("management.module_description")}</th>
                        <td>
                            <Input value={selectedModule.description} onChange={({ target }) => updateDescription(target.value)}></Input>
                        </td>
                    </tr>
                    <tr>
                        <th>{t("management.module_start_and_end_date")}</th>
                        <td>
                            <Input type="date"
                                value={dateObjectToHTMLDateInputValue(selectedModule.startDate) || ""}
                                onChange={({ target }) => updateStartDate(target.value)}
                                error={!selectedModule.startDate}
                            />
                            <Input type="date"
                                value={dateObjectToHTMLDateInputValue(selectedModule.endDate) || ""}
                                onChange={({ target }) => updateEndDate(target.value)}
                                error={!selectedModule.endDate}
                            />
                        </td>
                    </tr>
                    <tr>
                        <th>{t("management.module_ready_to_play")}</th>
                        <td>
                            <input type="checkbox"
                                checked={selectedModule.readyToPlay}
                                onChange={() => selectedModule.setReadyToPlay(!selectedModule.readyToPlay)}
                            ></input>
                        </td>
                    </tr>
                    <tr>
                        <th>{t("management.module_visible_in_public_menu")}</th>
                        <td>
                            <input type="checkbox"
                                checked={selectedModule.visibleInPublicMenu}
                                onChange={() => selectedModule.setVisibleInPublicMenu(!selectedModule.visibleInPublicMenu)}
                                disabled={!selectedModule.readyToPlay}
                            ></input>
                        </td>
                    </tr>
                    <tr>
                        <th>{t("management.highlight_module")}</th>
                        <td>
                            <input type="checkbox"
                                checked={selectedModule.highlighted}
                                onChange={() => selectedModule.setHighlighted(!selectedModule.highlighted)}
                            ></input>
                        </td>
                    </tr>
                    <tr>
                        <th>{t("management.module_complexity")}</th>
                        <td>
                            <Dropdown
                                value={selectedModule.editorComplexity}
                                onChange={(e => selectedModule.setEditorComplexity(+e.target.value as EditorComplexity))}
                            >
                                {allEditorComplexities.map(complexity => {
                                    if (complexity != EditorComplexity.Production) {
                                        return (<option
                                            key={complexity}
                                            value={complexity}
                                        >
                                            {t("editor.local_setting_complexity_" + complexity)}
                                        </option>
                                        );
                                    }

                                    return null;
                                })}
                            </Dropdown>
                        </td>
                    </tr>
                    <tr>
                        <th>{t("management.module_start_act")}</th>
                        <td>
                            <Dropdown disabled={selectedModule.isStandalone} value={selectedModule.startAtAct} onChange={(e => updateStartAct(+e.target.value))}>
                                <option key={1} value={1}>{t("action_editor.property_act")} 1</option>
                                <option key={2} value={2}>{t("action_editor.property_act")} 2</option>
                                <option key={3} value={3}>{t("action_editor.property_act")} 3</option>
                                <option key={4} value={4}>{t("action_editor.property_act")} 4</option>
                                <option key={5} value={5}>{t("action_editor.property_act")} 5</option>
                            </Dropdown>
                            {selectedModule.isStandalone && (
                                <div>{t("management.module_start_act_standalone_note")}</div>
                            )}
                        </td>
                    </tr>

                    <tr>
                        <th>{t("management.module_access_code")}</th>
                        <td>
                            <AccessCode
                                value={selectedModule.accesscode}
                                setValue={selectedModule.setAccesscode.bind(selectedModule)}
                                config={moduleParticipantAccessCodeConfig}
                            />
                            {hasStartAndEndDate && (
                                <div>{t("management.module_access_code_description")}</div>
                            )}
                            {!hasStartAndEndDate && (
                                <ErrorText>{t("management.module_missing_start_or_end_date")}</ErrorText>
                            )}
                        </td>
                    </tr>
                    <tr>
                        <th>
                            {t("management.module_standalone")}
                        </th>
                        <td>
                            <input type="checkbox" checked={selectedModule.isStandalone} onChange={e => toggleIsStandaloneModule()} />
                        </td>
                    </tr>
                    <tr>
                        <th>
                            {t("management.choose_standalone_map_id")}
                        </th>
                        <td>
                            <MapSelectorDropdown
                                disabled={!selectedModule.isStandalone}
                                value={selectedModule.standaloneMapId}
                                onChange={e => updateStandaloneModuleStartMapId(+e.target.value)}
                                className={(selectedModule.isStandalone && !moduleMapList.some(map => map.id === selectedModule.standaloneMapId)) ? "invalid" : undefined}
                            >
                                <option key={0} value={0}>{t("shared.no_map_selected")}</option>
                                {
                                    managementStore.getModuleMapList(selectedModule.$modelId).map(moduleMapData =>
                                        <option key={moduleMapData.id} value={moduleMapData.id}>(ID#{moduleMapData.id}) {moduleMapData.name}</option>
                                    )
                                }
                            </MapSelectorDropdown>
                        </td>
                    </tr>
                    <tr>
                        <th>{t("management.module_standalone_play_code")}</th>
                        <td>
                            <AccessCode
                                value={selectedModule.standalonePlayCode}
                                setValue={selectedModule.setStandalonePlayCode.bind(selectedModule)}
                                config={standaloneModulePlayCodeConfig}
                                disabled={!selectedModule.isStandalone}
                            />
                        </td>
                    </tr>
                    <tr>
                        <th></th>
                        <td>
                            <a href={getPublicGameVariantLink([selectedModule.$modelId])}>
                                {t("management.module_public_link")}
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td><button onClick={() => openModuleInEditor(selectedModule.$modelId)}>{t("management.open_module_in_editor")}</button></td>
                    </tr>
                </tbody>
            </PropertyContainer>
        </PropertyView>}
    </>);
});