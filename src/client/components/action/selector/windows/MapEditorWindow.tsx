import { observer } from "mobx-react-lite";
import React, { useEffect } from "react";
import { RiCloseLine } from "react-icons/ri";
import styled from "styled-components";
import { UiConstants } from "../../../../data/UiConstants";
import { selectorMapEditorStore } from "../../../../stores/MapEditorStore";
import { Submenu } from "../../../menu/PopupSubMenu";
import { SelectedMapElementsAndSelectElementsProps } from "../editors/ActionMapViewerSelectorButtonFromElement";
import { ActionMapViewProvider } from "../editors/ActionMapViewProvider";

const EditorPopupContainer = styled(Submenu)`
    z-index: ${UiConstants.Z_INDEX_POPUP_SUBMENU + 5};
    position: fixed;
    right: 100px;
    left: 100px;
    top: 70px;
    bottom: 100px;
    height: unset;
`;

const CloseButton = styled.div`
    position: absolute;
    top: 0px;
    right: 0px;

    background-color: #FFFFFF;
    text-align: center;
    height: ${UiConstants.SIZE_SLIDE_MENU_CLOSE_ICON};
    width: ${UiConstants.SIZE_SLIDE_MENU_CLOSE_ICON};
    font-size: ${UiConstants.SIZE_SLIDE_MENU_CLOSE_ICON_FONT};
    border-bottom-left-radius: ${UiConstants.BORDER_RADIUS};
    border: 1px solid black;
    border-right: none;
    border-top: none;

    &:hover {
      color: grey;
      cursor: pointer;
    }
`;

type Props = SelectedMapElementsAndSelectElementsProps & {
    closePopup: () => void;
    shouldShowEmptyAreaTriggers: boolean;
};

export const MapEditorWindow: React.FunctionComponent<Props> = observer(({
    selectedMapElements, selectElement, closePopup, shouldShowEmptyAreaTriggers
}) => {
    const elementIds = selectedMapElements.elements.map(element => element.id);
    useEffect(() => {
        selectorMapEditorStore.prepareActionMapViewer(elementIds, shouldShowEmptyAreaTriggers);
    }, [elementIds, shouldShowEmptyAreaTriggers]);

    return (
        <EditorPopupContainer>
            <CloseButton>
                <RiCloseLine onClick={closePopup} />
            </CloseButton>
            <ActionMapViewProvider
                selectedMapElements={selectedMapElements}
                selectElement={selectElement}
            />
        </EditorPopupContainer>
    );
});
