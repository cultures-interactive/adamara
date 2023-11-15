import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { IoMdHelpCircle } from "react-icons/io";
import styled from "styled-components";
import { Orientation, PopupSubMenu, PopupSubMenuIconContainer } from "../menu/PopupSubMenu";
import { Heading1Base } from "../shared/Heading";

const Heading = styled(Heading1Base)`
    padding-top: 0.3em;
    padding-bottom: 0.3em;
`;

const SpacingRow = styled.tr`
    height: 0.7em;
`;

const LabelExamplePairContainer = styled.tr`
`;

const SpacingAfterLabelExamplePair = styled.tr`
    height: 0.5em;
`;

const Label = styled.th`
    font-weight: normal;
    text-align: right;
    padding-right: 1em;
`;

const Example = styled.td`
`;

const Keyword = styled.span`
    background: lightgrey;
`;

const KeywordBold = styled(Keyword)`
    font-weight: bold;
`;

const KeywordItalic = styled(Keyword)`
    font-style: italic;
`;

export interface LabelExamplePairProps {
    labelKey: string;
    exampleKey: string;
    exampleElement?: JSX.Element;
}

const LabelExamplePair: React.FunctionComponent<LabelExamplePairProps> = ({ labelKey, exampleKey, exampleElement = <Keyword /> }) => {
    const { t } = useTranslation();

    return (
        <>
            <LabelExamplePairContainer>
                <Label>
                    {t(labelKey)}
                </Label>
                <Example>
                    <Trans i18nKey={exampleKey}>{exampleElement}</Trans>
                </Example>
            </LabelExamplePairContainer>
            <SpacingAfterLabelExamplePair />
        </>
    );
};

export interface Props {
    showTextStyleOptions: boolean;
}

export const TextFormatInfoPopup: React.FunctionComponent<Props> = ({ showTextStyleOptions }) => {
    const { t } = useTranslation();

    return (
        <PopupSubMenu
            orientation={Orientation.Left}
            relativeOffset={0}
            buttonContent={<PopupSubMenuIconContainer><IoMdHelpCircle /></PopupSubMenuIconContainer>}
            containerWidth={"max-content"}
            positionFixed={true}
        >

            <table>
                <tbody>
                    {showTextStyleOptions && (
                        <>
                            <tr>
                                <td colSpan={2}>
                                    <Heading>{t("action_editor.text_formatting_style_headline")}</Heading>
                                </td>
                            </tr>
                            <LabelExamplePair
                                labelKey={/*t*/"action_editor.text_formatting_style_bold"}
                                exampleKey={/*t*/"action_editor.text_formatting_style_emphasis_example"}
                                exampleElement={<KeywordBold />}
                            />
                            <LabelExamplePair
                                labelKey={/*t*/"action_editor.text_formatting_style_italic"}
                                exampleKey={/*t*/"action_editor.text_formatting_style_italic_example"}
                                exampleElement={<KeywordItalic />}
                            />
                            <SpacingRow />
                        </>
                    )}
                    <tr>
                        <td colSpan={2}>
                            <Heading>{t("action_editor.text_formatting_embedding")}</Heading>
                        </td>
                    </tr>
                    <LabelExamplePair
                        labelKey={/*t*/"action_editor.text_formatting_embedding_action_tree_parameter"}
                        exampleKey={/*t*/"action_editor.text_formatting_embedding_action_tree_parameter_example"}
                    />
                    <LabelExamplePair
                        labelKey={/*t*/"action_editor.text_formatting_embedding_variable"}
                        exampleKey={/*t*/"action_editor.text_formatting_embedding_variable_example"}
                    />
                    <LabelExamplePair
                        labelKey={/*t*/"action_editor.text_formatting_embedding_item_name"}
                        exampleKey={/*t*/"action_editor.text_formatting_embedding_item_name_example"}
                    />
                    <LabelExamplePair
                        labelKey={/*t*/"action_editor.text_formatting_embedding_character_name"}
                        exampleKey={/*t*/"action_editor.text_formatting_embedding_character_name_example"}
                    />
                    <LabelExamplePair
                        labelKey={/*t*/"action_editor.text_formatting_embedding_player_name"}
                        exampleKey={/*t*/"action_editor.text_formatting_embedding_player_name_example"}
                    />
                </tbody>
            </table>
        </PopupSubMenu>
    );
};