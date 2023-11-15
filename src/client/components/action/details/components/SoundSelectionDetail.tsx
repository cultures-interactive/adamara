import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { ParsedPath } from "path";
import { MenuCardScrollContainer } from "../../../menu/MenuCardScrollContainer";
import { ListItem } from "../../../menu/ListItem";
import { AiFillSound, AiOutlineSearch } from "react-icons/ai";
import { InputWithMargin } from "../../../editor/Input";
import Highlighter from "react-highlight-words";
import { ActionModel } from "../../../../../shared/action/ActionModel";
import { BsBraces } from "react-icons/bs";
import { SoundActionHelper } from "../../../../canvas/game/controller/SoundActionHelper";
import { UiConstants } from "../../../../data/UiConstants";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 350px; 
`;

const CenterRow = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
`;

const Audio = styled.audio`
    margin: 4px;
`;

const SoundIcon = styled(AiFillSound)`
    padding-top: 4px;
    margin-right: 4px;
`;

const TreeParameterIcon = styled(BsBraces)`
    padding-top: 4px;
    margin-right: 4px;
`;

const Headline = styled.div`
`;

const ScrollContainer = styled(MenuCardScrollContainer)`
    max-height: 150px;
    margin: 4px;

    &.invalid {
        outline: 2px solid ${UiConstants.COLOR_VALUE_INVALID};
        border-radius: 2px;
        border-color: rgba(0, 0, 0, 0);
    }

    &:focus {
        outline: 2px solid ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
        border-radius: 2px;
        border-color: rgba(0, 0, 0, 0);
    }
    
    &:focus.invalid {
        outline: 2px solid ${UiConstants.COLOR_VALUE_INVALID};
        border-radius: 2px;
        border-color: rgba(0, 0, 0, 0);
    }
`;

const SearchRow = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
`;

const NoSoundText = styled.div`
    margin: 4px;
`;

const Separator = styled.hr`
  border: 0;
  border-top: 1px dashed grey;
`;

const SearchIcon = styled(AiOutlineSearch)`
    display: flex;
    flex-grow: 0;
    flex-shrink: 1;
    width: 20px;
`;

const SearchInput = styled(InputWithMargin)`
    flex-grow: 1;
    flex-shrink: 0;
`;

interface Props {
    soundPaths: ParsedPath[];
    onSelectPath: (path: ParsedPath) => void;
    selectedPath?: ParsedPath;

    action?: ActionModel; // to read sound tree parameters (using its parent as the search scope)
    onSelectTreeParameter?: (parameter: string) => void;
    selectedTreeParameter?: string;

    showEmptyStateAsInvalid: boolean;
}

export const SoundSelectionDetail: React.FunctionComponent<Props> = observer((props) => {
    const { t } = useTranslation();
    const [searchText, setSearchText] = useState("");
    const [treeParameterSounds] = useState(SoundActionHelper.findSoundParameterNames(props.action));

    const soundUrl = props.selectedPath ? props.selectedPath.dir + "/" + props.selectedPath.name + props.selectedPath.ext : null;
    const currentSoundList = filterBySearchText(props.soundPaths);
    const areSoundsAvailable = currentSoundList.length > 0;

    function onSelectPath(path: ParsedPath) {
        if (path == props.selectedPath) props.onSelectPath(null);
        else props.onSelectPath(path);
    }

    function onSelectTreeParameter(treeParameter: string) {
        props.onSelectTreeParameter(treeParameter);
    }

    function onSearchTextChange(text: string) {
        setSearchText(text);
    }

    function getSelectionTitle(): string {
        if (props?.selectedPath) return props?.selectedPath.name;
        if (props?.selectedTreeParameter) return props?.selectedTreeParameter;
        return "-";
    }

    function filterBySearchText(paths: ParsedPath[]): ParsedPath[] {
        if (!paths) return [] as ParsedPath[];
        if (!searchText || searchText.trim().length == 0) return paths;
        return paths.filter(path => path.name && path.name.toLowerCase().includes(searchText)).filter(item => item != null);
    }

    return (
        <Container>
            <>
                <Headline>
                    {t("action_editor.node_play_sound_select") + ": " + getSelectionTitle()}
                </Headline>
                <SearchRow>
                    <SearchIcon />
                    <SearchInput
                        type={"text"}
                        onChange={({ target }) => onSearchTextChange(target.value)}>
                    </SearchInput>
                </SearchRow>
            </>
            {
                areSoundsAvailable && (
                    <>
                        <ScrollContainer
                            className={(!props.showEmptyStateAsInvalid || props.selectedPath || props.selectedTreeParameter) ? "" : "invalid"}
                        >
                            {
                                // == parameter sound list ==
                                treeParameterSounds.map((soundParameterName, index) => (
                                    <ListItem
                                        key={index}
                                        className={soundParameterName == props.selectedTreeParameter ? "selected" : ""}
                                        onClick={_ => onSelectTreeParameter(soundParameterName)}
                                    >
                                        <TreeParameterIcon />
                                        {soundParameterName}
                                    </ListItem>

                                ))
                            }
                            {(treeParameterSounds.length > 0) && (<Separator />)}
                            {
                                // == default sound list ==
                                currentSoundList.map((path, index) => (
                                    <ListItem
                                        key={index}
                                        className={path?.dir == props.selectedPath?.dir && path?.base == props.selectedPath?.base ? "selected" : ""}
                                        onClick={_ => onSelectPath(path)}
                                    >
                                        {
                                            path?.name && (
                                                <>
                                                    <SoundIcon />
                                                    <Highlighter
                                                        searchWords={[searchText]}
                                                        textToHighlight={path.name}>
                                                    </Highlighter>
                                                </>
                                            )
                                        }
                                    </ListItem>
                                )
                                )
                            }
                        </ScrollContainer>
                        <CenterRow>
                            {
                                // == sound preview ==
                                soundUrl && (<Audio controls preload={"auto"} src={soundUrl} />)
                            }
                        </CenterRow>
                    </>
                )
            }
            {!areSoundsAvailable && (<NoSoundText>{t("action_editor.node_play_sound_no_sounds")}</NoSoundText>)}
        </Container>
    );
});