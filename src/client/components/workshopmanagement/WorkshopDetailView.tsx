import React from "react";
import styled from "styled-components";
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from "jspdf";
import { Input } from "../shared/Input";
import { MenuCard } from "../menu/MenuCard";
import { observer } from "mobx-react-lite";
import { managementStore } from "../../stores/ManagementStore";
import { ModulesOfWorkshopListView } from "./ManagementListView";
import { Trans, useTranslation } from "react-i18next";
import { ModulesToPlayListView } from "./ModuleToPlayListView";
import { IoMdArrowDropdown, IoMdArrowDropright } from "react-icons/io";
import { ListItem } from "../menu/ListItem";
import { undoableManagementToggleItemViewOpen } from "../../stores/undo/operation/ManagementToggleItemViewOpenOp";
import { RiDeleteBack2Line } from "react-icons/ri";
import { AccessCode } from "./AccessCode";
import { userStore } from "../../stores/UserStore";
import { workshopAdminAccessCodeConfig, workshopPlayCodeConfig } from "../../../shared/helper/accesscodeHelpers";

const PropertyView = styled(MenuCard)`
    grid-column-start: 2;
    pointer-events: all;
`;

const PropertyContainer = styled.table`
    background: white;
    padding: 3px;
    margin: 3px;

    th {
        font-weight: normal;
        vertical-align: top;
        padding: 5px 0px;
    }
`;

const ContentListItem = styled(ListItem)`
    :hover {
        cursor: default;
    }
`;

const ListItemHeader = styled.div`
    display: contents;
    :hover {
        cursor: pointer;
    }
`;

interface ItemEditProps {
    editItem: string;
}

export const WorkshopDetailView: React.FunctionComponent<ItemEditProps> = observer((props) => {
    const { t } = useTranslation();

    const selectedWorkshop = managementStore.getWorkshop(props.editItem);
    const modulesToPlayOpenString = selectedWorkshop.$modelId + "-modulesToPlay";

    const defaultServerUrl = window.location.origin;
    const currentServerUrl = selectedWorkshop.serverUrl || defaultServerUrl;

    const generatePDF = () => {
        const doc = new jsPDF();
        const brandImageSrc = "assets/branding/ADAMARA_harshwaters_A.png";
        const font = doc.getFont();
        const infoFontSize = 14;
        const blockTitleFontSize = 18;
        const blockValueFontSize = 22;

        const generatePDFHeader = () => {
            const qrCodeCanvas: any = document.querySelector('.qrCode > canvas');

            doc.addImage(brandImageSrc, "PNG", 57, 20, 100, 56.3);
            doc.addImage(qrCodeCanvas, "JPEG", 82.5, 90, 45, 45);
            generateInfoBlock("URL", currentServerUrl, 150);
        };

        const generateInstructions = () => {
            doc.setFontSize(infoFontSize);
            doc.text([t("management.pdf_instructions_1"), t("management.pdf_instructions_2")], 105, 250, { align: "center" });
        };

        const generateInfoBlock = (blockName: string, blockValue: string, yPos: number) => {
            doc.setFontSize(blockTitleFontSize);
            doc.text(blockName, 105, yPos, { align: "center" });
            doc.setFont(font.fontName, "bold");
            doc.setFontSize(blockValueFontSize);
            doc.text(blockValue, 105, yPos + 10, { align: "center" });
            doc.setFont(font.fontName, "normal");
        };

        doc.setProperties({ title: "Workshop Print Sheet" });

        generatePDFHeader();
        generateInfoBlock(t("management.workshop_play_code"), selectedWorkshop.playcode, 180);
        generateInstructions();

        selectedWorkshop.modules.map(moduleId => {
            const module = managementStore.getModule(moduleId);
            if (!module)
                return;

            doc.addPage();

            generatePDFHeader();
            generateInfoBlock(t("management.module_name"), module.name, 180);
            generateInfoBlock(t("management.module_access_code"), module.accesscode, 210);
            generateInstructions();

        });
        window.open(doc.output("bloburl").toString());
    };

    return (<>
        {selectedWorkshop && <PropertyView>
            <div style={{ display: "none" }} className="qrCode">
                <QRCodeCanvas value={currentServerUrl} />
            </div>
            <PropertyContainer>
                <tbody>
                    <tr>
                        <th>{t("management.workshop_name")}</th>
                        <td>
                            <Input value={selectedWorkshop.name} onChange={({ target }) => selectedWorkshop.setName(target.value)}></Input>
                        </td>
                    </tr>
                    <tr>
                        <th>{t("management.workshop_play_code")}</th>
                        <td>
                            <AccessCode
                                value={selectedWorkshop.playcode}
                                setValue={selectedWorkshop.setPlaycode.bind(selectedWorkshop)}
                                config={workshopPlayCodeConfig}
                            />
                        </td>
                    </tr>
                    <tr>
                        <th>{t("management.workshop_access_code")}</th>
                        <td>
                            <AccessCode
                                value={selectedWorkshop.accesscode}
                                setValue={selectedWorkshop.setAccesscode.bind(selectedWorkshop)}
                                config={workshopAdminAccessCodeConfig}
                            />
                            {userStore.mayEditAllWorkshops && (
                                <div>
                                    <Trans i18nKey={/*t*/"management.workshop_access_code_should_be_removed_after_workshop"}>0<RiDeleteBack2Line />2</Trans>
                                </div>
                            )}
                        </td>
                    </tr>
                    <tr>
                        <th>{t("management.pdf_server_url")}</th>
                        <td>
                            <Input
                                value={selectedWorkshop.serverUrl}
                                placeholder={defaultServerUrl}
                                onChange={({ target }) => selectedWorkshop.setServerUrl(target.value)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td><button onClick={() => generatePDF()}>{t("management.print_pdf")}</button></td>
                    </tr>
                </tbody>
            </PropertyContainer>
            <ContentListItem>
                <ListItemHeader onClick={() => undoableManagementToggleItemViewOpen(modulesToPlayOpenString)}>
                    {managementStore.isDetailViewOpen(modulesToPlayOpenString) ? <IoMdArrowDropdown /> : <IoMdArrowDropright />}{t("management.modules_to_play")}:
                </ListItemHeader>
                {selectedWorkshop && managementStore.isDetailViewOpen(modulesToPlayOpenString) && (
                    <ModulesToPlayListView
                        playableModules={managementStore.getAllPlayableModules}
                        modulesToPlay={selectedWorkshop?.modulesToPlay}
                        addModuleToPlay={selectedWorkshop.addModuleToPlay.bind(selectedWorkshop)}
                        removeModuleToPlay={selectedWorkshop.removeModuleToPlay.bind(selectedWorkshop)}
                        showFilter={true}
                    />
                )}
            </ContentListItem>
            <ContentListItem>
                <div>{t("management.modules")}:</div>
                <div>
                    <ModulesOfWorkshopListView workshopId={selectedWorkshop?.$modelId} />
                </div>
            </ContentListItem>
        </PropertyView>}

    </>);
});