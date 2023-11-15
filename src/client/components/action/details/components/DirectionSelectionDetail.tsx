import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Direction, DirectionHelper } from "../../../../../shared/resources/DirectionHelper";
import { UiConstants } from "../../../../data/UiConstants";
import { FiArrowDown, FiArrowDownLeft, FiArrowDownRight, FiArrowLeft, FiArrowRight, FiArrowUp, FiArrowUpLeft, FiArrowUpRight } from "react-icons/fi";
import { FaCompressArrowsAlt } from "react-icons/fa";

const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
`;

const CheckboxContainer = styled.div`
    display: flex;
    flex-direction: column;
    border: solid 1px black;
    flex-shrink: 1;
    flex-grow: 0;
    margin-left: 4px;
`;

const HeaderText = styled.div`
    margin-bottom: 4px;
`;

const DescriptionText = styled.div`
    display: flex;
    margin-left: 4px;
    font-size: small;
    align-items: center;
    justify-content: center;
`;

const DirectionButton = styled.div`
    display: flex;
    width: 20px;
    height: 20px;
    border: 1px solid black;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    &.selected {
        background-color: ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
    }
`;

interface Props {
    initialDirection: Direction;
    onSelectionChange: (direction: Direction) => void;
}

export const DirectionSelectionDetail: React.FunctionComponent<Props> = observer(({ initialDirection, onSelectionChange }) => {
    const { t } = useTranslation();

    const alignmentDescription = initialDirection == null ? "Center" : DirectionHelper.getName(initialDirection);

    return (
        <div>
            <HeaderText>
                {t("action_editor.node_cut_scene_text_alignment")}
            </HeaderText>
            <DescriptionText>
                {t("action_editor.direction_" + alignmentDescription.toLowerCase())}
            </DescriptionText>
            <Row>
                <CheckboxContainer>
                    <Row>
                        <DirectionButton className={initialDirection == Direction.NorthWest ? "selected" : ""}
                            onClick={(event) => onSelectionChange(Direction.NorthWest)}
                        >
                            {initialDirection == Direction.NorthWest && <FiArrowUpLeft />}
                        </DirectionButton>
                        <DirectionButton className={initialDirection == Direction.North ? "selected" : ""}
                            onClick={(event) => onSelectionChange(Direction.North)}
                        >
                            {initialDirection == Direction.North && <FiArrowUp />}
                        </DirectionButton>
                        <DirectionButton className={initialDirection == Direction.NorthEast ? "selected" : ""}
                            onClick={(event) => onSelectionChange(Direction.NorthEast)}
                        >
                            {initialDirection == Direction.NorthEast && <FiArrowUpRight />}
                        </DirectionButton>
                    </Row>
                    <Row>
                        <DirectionButton className={initialDirection == Direction.West ? "selected" : ""}
                            onClick={(event) => onSelectionChange(Direction.West)}
                        >
                            {initialDirection == Direction.West && <FiArrowLeft />}
                        </DirectionButton>
                        <DirectionButton className={initialDirection == null ? "selected" : ""}
                            onClick={(event) => onSelectionChange(null)}
                        >
                            {initialDirection == null && <FaCompressArrowsAlt />}
                        </DirectionButton>
                        <DirectionButton className={initialDirection == Direction.East ? "selected" : ""}
                            onClick={(event) => onSelectionChange(Direction.East)}
                        >
                            {initialDirection == Direction.East && <FiArrowRight />}
                        </DirectionButton>
                    </Row>
                    <Row>
                        <DirectionButton className={initialDirection == Direction.SouthWest ? "selected" : ""}
                            onClick={(event) => onSelectionChange(Direction.SouthWest)}
                        >
                            {initialDirection == Direction.SouthWest && <FiArrowDownLeft />}
                        </DirectionButton>

                        <DirectionButton className={initialDirection == Direction.South ? "selected" : ""}
                            onClick={(event) => onSelectionChange(Direction.South)}
                        >
                            {initialDirection == Direction.South && <FiArrowDown />}
                        </DirectionButton>

                        <DirectionButton className={initialDirection == Direction.SouthEast ? "selected" : ""}
                            onClick={(event) => onSelectionChange(Direction.SouthEast)}
                        >
                            {initialDirection == Direction.SouthEast && <FiArrowDownRight />}
                        </DirectionButton>
                    </Row>
                </CheckboxContainer>
            </Row>
        </div>
    );
});