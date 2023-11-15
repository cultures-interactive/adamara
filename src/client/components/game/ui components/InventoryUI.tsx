import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { BackgroundColorElement, BackgroundColorElementActive, BorderColor, GUITextBold, GUIHeadlineLight, GUIHeadlineSuffix, GUISubBox, GUIButton, GUIRow } from "./GameUIElements";
import { wrapArraySet } from "../../../../shared/helper/IterableIteratorWrapper";
import styled from "styled-components";
import { UiConstants } from "../../../data/UiConstants";
import { BsBox } from "react-icons/bs";
import { UseItemTriggerActionModel } from "../../../../shared/action/ActionModel";
import { gameStore } from "../../../stores/GameStore";
import { imageStore } from "../../../stores/ImageStore";
import { itemStore } from "../../../stores/ItemStore";
import { InventoryWindow } from "./NineSlices";

const GridItemSize = 80;

const Grid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
`;

const GridItem = styled.div`
    display: flex;
    flex-direction: column;
    margin: 2px;
    padding: 4px;
    width: ${GridItemSize + "px"};
    height: ${GridItemSize + "px"};
    font-size: small;
    overflow: hidden;
    background-color: ${BackgroundColorElement};
    border-radius: ${UiConstants.BORDER_RADIUS};
    &.selected {
        background-color: ${BackgroundColorElementActive};
        outline: solid 2px ${BorderColor};
    }
`;

const ItemImage = styled.img`
    display:flex;
    align-self: center;
    width: ${(GridItemSize * 0.9) + "px"};
    height: ${(GridItemSize * 0.9) + "px"};
    border: 0;
`;

const DescriptionBox = styled.div`
    overflow-wrap: break-word;
    max-width: ${(GridItemSize * 3) + "px"};
    margin-left: 2px;
`;

const TagContainer = styled.div`
    margin-top: 4px;
    display: flex;
    flex-direction: row;
`;

const Tag = styled.div`
    font-size: small;
    margin-right: 4px;
`;

const ItemIcon = styled(BsBox)`
    margin-right: 6px;
`;

const ItemName = styled.div`
    display:flex;
    flex-grow:1;
    align-items: center;
`;

export const InventoryUI: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const playerInventory = gameStore.gameEngine.gameState.playerInventory;
    const [selectedItemId, setSelectedItemId] = useState("");

    function hasActiveItemTrigger(itemId: string): boolean {
        const nodes = UseItemTriggerActionModel.findByItemId(gameStore.gameEngine.searchActiveTriggerNodes(), itemId);
        return nodes && nodes.length > 0;
    }

    function useItem(itemId: string) {
        gameStore.gameEngine.handleUseItemTrigger(itemId);
    }

    function onItemClick(itemName: string) {
        setSelectedItemId(itemName);
    }

    return (
        <InventoryWindow>
            <GUIHeadlineLight>
                {t("game.inventory")}
                <GUIHeadlineSuffix>{"(" + playerInventory.size + ")"}</GUIHeadlineSuffix>
            </GUIHeadlineLight>
            <GUISubBox>
                <Grid>
                    {
                        wrapArraySet(playerInventory).map((itemId, index) =>
                            <GridItem
                                key={index}
                                onClick={_ => onItemClick(itemId)}
                                className={itemId == selectedItemId ? "selected" : ""}
                            >
                                {
                                    imageStore.getImageUrl(itemStore.getItem(itemId)?.itemImageId) && (
                                        <ItemImage src={imageStore.getImageUrl(itemStore.getItem(itemId)?.itemImageId)} />
                                    )
                                }

                                {
                                    !imageStore.getImageUrl(itemStore.getItem(itemId)?.itemImageId) && (
                                        <>
                                            <ItemName>
                                                {itemStore.getItem(itemId)?.name.get(gameStore.languageKey, true)}
                                            </ItemName>
                                        </>
                                    )
                                }
                            </GridItem>
                        )
                    }
                </Grid>
            </GUISubBox>
            {
                (selectedItemId && playerInventory.has(selectedItemId)) && (
                    <GUISubBox>
                        <GUITextBold> <ItemIcon />{itemStore.getItem(selectedItemId)?.name.get(gameStore.languageKey, true)}</GUITextBold>
                        <DescriptionBox>
                            {itemStore.getItem(selectedItemId)?.description.get(gameStore.languageKey, true)}
                            <TagContainer>
                                {
                                    itemStore.getItem(selectedItemId)?.tags.map((tagName, index) =>
                                        <Tag key={index}>
                                            {"#" + tagName}
                                        </Tag>
                                    )
                                }
                            </TagContainer>
                        </DescriptionBox>
                        {
                            hasActiveItemTrigger(selectedItemId) && (
                                <GUIRow>
                                    <div onClick={(_) => useItem(selectedItemId)}>
                                        <GUIButton>
                                            {t("game.inventory_use_item")}
                                        </GUIButton>
                                    </div>
                                </GUIRow>
                            )
                        }
                    </GUISubBox>
                )
            }
        </InventoryWindow>
    );
});