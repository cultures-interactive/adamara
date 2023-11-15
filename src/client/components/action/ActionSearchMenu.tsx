import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { MenuCard } from "../menu/MenuCard";
import { MenuCardLabel, MenuCardLabelSuffix } from "../menu/MenuCardLabel";
import { InputWithMargin } from "../editor/Input";
import { ActionModel } from "../../../shared/action/ActionModel";
import { MenuCardScrollContainer } from "../menu/MenuCardScrollContainer";
import Highlighter from "react-highlight-words";
import { UiConstants } from "../../data/UiConstants";
import { AiOutlineSearch } from "react-icons/ai";
import { useZoomPanHelper } from "react-flow-renderer";
import { CgEditBlackPoint } from "react-icons/cg";
import { actionEditorStore } from "../../stores/ActionEditorStore";
import { getActionShortDescriptionForActionEditor } from "../../helper/actionEditorHelpers";
import { actionNodeIcon } from "./actionNodeData";
import { Heading2Base } from "../shared/Heading";

const Container = styled(MenuCard)`
    width: 300px;
`;

const SingleSearchResult = styled.div<ColorProps>`
    background-color: ${props => props.color ? props.color : "#FFFFFF"};
    display: flex;
    flex-direction: column;
    margin: 2px;
    border-radius: ${UiConstants.BORDER_RADIUS};
    border: 1px solid black;
`;

interface ColorProps {
    color?: string;
}

const SearchIcon = styled(AiOutlineSearch)`
    display: flex;
    flex-grow: 0;
    flex-shrink: 1;
`;

const SearchRow = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
`;

const SearchInput = styled(InputWithMargin)`
    flex-grow: 1;
    flex-shrink: 0;
`;

const TitleContainer = styled(Heading2Base)`
    display: flex;
    flex-direction: row;
    padding: 4px;
    justify-content: center;
    align-items: center;
`;

const TileIcon = styled.div`
    display: flex;
    flex-grow: 0;
    flex-shrink: 1;
    margin: 4px;
`;

const TitleHighlighter = styled(Highlighter)`
    font-size: large;
    flex-grow: 1;
    flex-shrink: 0;
`;

const IdContainer = styled.div`
    display: flex;
    flex-direction: row;
    margin: 4px;
    font-size: small;
`;

const IdHighlighter = styled(Highlighter)`
    font-family: monospace;
    margin-left: 4px;
`;

const DescriptionHighlighter = styled(Highlighter)`
    margin-left: 4px;
`;

const SearchResultContainer = styled(MenuCardScrollContainer)`
    display: flex;
    flex-direction: column;
    max-height: 400px;
`;

const JumpButton = styled(CgEditBlackPoint)`
    background-color: #FFFFFF;
    width: 20px;
    height: 20px;
    cursor: pointer;
    &:hover {
        background-color: ${UiConstants.COLOR_HOVER};
    }
`;

interface Props {
    property: boolean;
}

const SearchEventMinIntervalTimeMS = 1000;

export const ActionSearchMenu: React.FunctionComponent<Props> = observer(({ property }) => {
    const { t } = useTranslation();
    const [searchResult, setSearchResult] = useState([]);
    const [lastKeyEventTime, setLastKeyEventTime] = useState(-1);
    const [timeoutId, setTimeoutId] = useState(null);
    const [searchText, setSearchText] = useState("");
    const zoomPanHelper = useZoomPanHelper();

    function onSearchTextChange(text: string) {
        const timeSinceLastKeyEvent = Date.now() - lastKeyEventTime;
        if (lastKeyEventTime < 0 || timeSinceLastKeyEvent > SearchEventMinIntervalTimeMS) {
            if (timeoutId) clearTimeout(timeoutId);
            setSearchText(text);
            setSearchResult(actionEditorStore.searchActionNodes(text, t));
            setLastKeyEventTime(Date.now());
        } else {
            if (timeoutId) clearTimeout(timeoutId);
            const id = setTimeout(() => onSearchTextChange(text), SearchEventMinIntervalTimeMS - timeSinceLastKeyEvent);
            setTimeoutId(id);
        }
    }

    return (
        <Container>
            <MenuCardLabel>
                {t("action_editor.search_node")}
                <MenuCardLabelSuffix>{"(" + searchResult.length + ")"}</MenuCardLabelSuffix>
            </MenuCardLabel>
            <SearchRow>
                <SearchIcon />
                <SearchInput
                    type={"text"}
                    onChange={({ target }) => onSearchTextChange(target.value)}>
                </SearchInput>
            </SearchRow>
            {
                (searchResult.length > 0) && <SearchResultContainer>
                    {
                        searchResult.map((action: ActionModel, index) =>
                            <SingleSearchResult key={index} color={action.nodeColor()}>
                                <TitleContainer>
                                    <TileIcon>
                                        {
                                            actionNodeIcon(action)
                                        }
                                    </TileIcon>
                                    <TitleHighlighter
                                        searchWords={[searchText]}
                                        autoEscape={true}
                                        textToHighlight={t(action.title())}
                                    >
                                    </TitleHighlighter>
                                    <JumpButton onClick={() => actionEditorStore.jumpToAction(action, zoomPanHelper)} />
                                </TitleContainer>

                                <DescriptionHighlighter
                                    searchWords={[searchText]}
                                    autoEscape={true}
                                    textToHighlight={getActionShortDescriptionForActionEditor(action, t)}
                                />

                                <IdContainer>
                                    id:
                                    <IdHighlighter
                                        searchWords={[searchText]}
                                        autoEscape={true}
                                        textToHighlight={action.$modelId}
                                    >
                                    </IdHighlighter>
                                </IdContainer>

                            </SingleSearchResult>
                        )
                    }
                </SearchResultContainer>
            }
        </Container>
    );
});