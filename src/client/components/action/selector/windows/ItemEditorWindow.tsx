import { observer } from "mobx-react-lite";
import React from "react";
import styled from "styled-components";
import { UiConstants } from "../../../../data/UiConstants";
import { Submenu } from "../../../menu/PopupSubMenu";
import { ItemConfigurator } from "../editors/ItemConfigurator";


const EditorPopupContainer = styled(Submenu) <{ moveX?: number; }>`
    z-index: ${UiConstants.Z_INDEX_POPUP_SUBMENU + 5};
    transform: ${props => `translateX(${props.moveX}px)`};
    position: absolute;
`;

interface ItemEditorWindowProps {
    closeEditor: () => void;
    selectorWidth: number;
}

export const ItemEditorWindow: React.FunctionComponent<ItemEditorWindowProps> = observer((props) => {

    const itemEditorWindowWidth = 420;

    return <EditorPopupContainer moveX={(props.selectorWidth + itemEditorWindowWidth) * -1}>
        <ItemConfigurator closeEditor={props.closeEditor} />
    </EditorPopupContainer>;
});
