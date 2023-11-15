import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { MenuCard } from "../../menu/MenuCard";
import { SimpleCutSceneActionModel } from "../../../../shared/action/ActionModel";
import { DisplayMode, TranslatedStringActionDetail } from "./components/TranslatedStringActionDetail";
import { AnimationSelectionDetail } from "./components/AnimationSelectionDetail";
import { InputWithMargin } from "../../editor/Input";
import { AnimationPropertiesValueModel } from "../../../../shared/action/ValueModel";
import { DirectionSelectionDetail } from "./components/DirectionSelectionDetail";
import { Dropdown } from "../../editor/Dropdown";
import { Slider, SliderThumb, SliderTrack } from "../../editor/Slider";
import { TextFormatInfoPopup } from "../TextFormatInfoPopup";
import { CutSceneTextModel } from "../../../../shared/action/CutSceneTextModel";
import { Direction } from "../../../../shared/resources/DirectionHelper";
import { FaPlus } from "react-icons/fa";
import { AiFillDelete } from "react-icons/ai";
import { ElementGroupContainer } from "./components/BaseElements";

const Container = styled.div`
    min-width: 320px; 
`;

const SubContainer = styled.div`
    margin: 4px;
    margin-left: 8px; 
`;

const TopMargin = styled.div`
    margin-top: 4px; 
`;

const MarginRow = styled.div`
    display: flex;
    flex-direction: row;
    margin-top: 4px;
    align-items: center;
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
`;

const OptionsContainer = styled.div`
    display: flex;
    flex-direction: row;
    margin-top: 12px;
    margin-left: 8px;
    margin-bottom: 8px;
`;

const RowLabel = styled.div`
    min-width: 100px;
    cursor: pointer;
`;

const TextItemContainer = styled(ElementGroupContainer)`
`;

const Label = styled.label`
    flex-shrink: 0;
    flex-grow: 1;
`;

const ShrinkContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    flex-shrink: 1;
`;

const Button = styled.button`
    cursor: pointer;
    margin: 4px;
    display: flex;
    align-items: center;
`;

const GrowContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    flex-shrink: 0;
    margin-left: 20px;
`;

interface Props {
    action: SimpleCutSceneActionModel;
}

export const SimpleCutSceneActionDetails: React.FunctionComponent<Props> = observer(({ action }) => {
    const { t } = useTranslation();

    function onClickToggleText() {
        if (action.textItems) action.setTextItems(null);
        else action.setTextItems([new CutSceneTextModel({})]);
    }

    function onClickToggleLoop() {
        action.animation.setLoop(!action.animation.loop);
    }

    function onClickTextStyle(styleValue: number, itemIndex: number) {
        action.textItems[itemIndex].setTextStyle(styleValue);
    }

    function onClickToggleTypeAnimation(itemIndex: number) {
        action.textItems[itemIndex].setEnabledTypeAnimation(!action.textItems[itemIndex].enabledTypeAnimation);
    }

    function onClickDirection(direction: Direction, itemIndex: number) {
        action.textItems[itemIndex].setTextContainerAlignmentDirection(direction);
    }

    function onClickToggleAnimation() {
        if (action.animation) action.setAnimation(null);
        else action.setAnimation(new AnimationPropertiesValueModel({}));
    }

    function onClickAddText() {
        action.addTextItem();
    }

    function onClickDeleteTextItem(itemIndex: number) {
        action.removeTextItem(itemIndex);
    }

    return (
        <Container>
            <MenuCard>
                <MarginRow>
                    <Label>
                        <InputWithMargin
                            type={"checkbox"}
                            checked={action.textItems != null}
                            onChange={onClickToggleText}
                        />
                        {t("action_editor.node_cut_scene_text")}
                    </Label>
                    <TextFormatInfoPopup showTextStyleOptions={false} />

                </MarginRow>

                {
                    action.textItems && (
                        <>
                            <Button onClick={onClickAddText}><FaPlus />&nbsp;{t("action_editor.node_cut_scene_add_text")}</Button>
                            {
                                action.textItems.map((item, index) => (
                                    <TextItemContainer key={index}>
                                        <Row>
                                            <Label>
                                                {index + 1 + ". " + t("action_editor.node_cut_scene_text_item_headline")}
                                            </Label>
                                            {
                                                action.textItems.length > 1 && <Button onClick={_ => onClickDeleteTextItem(index)}><AiFillDelete /></Button>
                                            }
                                        </Row>
                                        <TranslatedStringActionDetail
                                            key={index}
                                            name={""}
                                            translatedString={item.text}
                                            displayMode={DisplayMode.CommentAndGenders}
                                            allowBlankValue={false}
                                        />
                                        <OptionsContainer>
                                            <ShrinkContainer>
                                                <DirectionSelectionDetail
                                                    initialDirection={item.textContainerAlignmentDirection}
                                                    onSelectionChange={(direction) => {
                                                        onClickDirection(direction, index);
                                                    }}
                                                />
                                            </ShrinkContainer>
                                            <GrowContainer>
                                                <Label>
                                                    {t("action_editor.node_cut_scene_text_style")}
                                                </Label>

                                                <Dropdown
                                                    value={item.textStyle ? "1" : "0"}
                                                    onChange={e => onClickTextStyle(e.target.value === "1" ? 1 : 0, index)}
                                                >
                                                    <option value="1">{t("action_editor.node_cut_scene_text_style_black_white")}</option>
                                                    <option value="0">{t("action_editor.node_cut_scene_text_style_white_black")}</option>
                                                </Dropdown>
                                                <TopMargin>
                                                    <Label>
                                                        {t("action_editor.node_cut_scene_text_width") + " " + item.textContainerWidthPercent + "%"}
                                                    </Label>
                                                    <Slider
                                                        value={item.textContainerWidthPercent}
                                                        min={10}
                                                        max={100}
                                                        step={1}
                                                        renderTrack={SliderTrack}
                                                        renderThumb={SliderThumb}
                                                        onChange={(value) => item.setTextContainerWidthPercent(value as number)}
                                                    />
                                                </TopMargin>
                                                <TopMargin>
                                                    <Label>
                                                        <InputWithMargin
                                                            type={"checkbox"}
                                                            checked={item.enabledTypeAnimation}
                                                            onChange={e => onClickToggleTypeAnimation(index)}>
                                                        </InputWithMargin>
                                                        {t("action_editor.node_cut_scene_type_animation")}
                                                    </Label>
                                                </TopMargin>
                                            </GrowContainer>

                                        </OptionsContainer>
                                    </TextItemContainer>
                                ))
                            }
                        </>
                    )
                }
            </MenuCard>


            <MenuCard>
                <MarginRow onClick={onClickToggleAnimation}>
                    <InputWithMargin
                        type={"checkbox"}
                        checked={action.animation != null}
                        onChange={e => { }}
                    />
                    <Label>
                        {t("action_editor.node_cut_scene_animation")}
                    </Label>
                </MarginRow>
                {
                    action.animation && (
                        <SubContainer>
                            <AnimationSelectionDetail animationProp={action.animation} />
                            <MarginRow onClick={onClickToggleLoop}>
                                <RowLabel>
                                    {t("action_editor.property_animation_loop")}
                                </RowLabel>
                                <InputWithMargin
                                    type={"checkbox"}
                                    checked={action.animation.loop}
                                    onChange={e => { }}
                                />
                            </MarginRow>
                        </SubContainer>
                    )
                }
            </MenuCard>
        </Container>
    );
});