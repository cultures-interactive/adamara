import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { MenuCard } from '../menu/MenuCard';
import styled from "styled-components";
import { FaUserCheck } from "react-icons/fa";
import { editorStore } from '../../stores/EditorStore';
import { MenuCardLabel } from '../menu/MenuCardLabel';
import { undoableSetUsername } from '../../stores/undo/operation/SetUsernameOp';
import { currentMapUserListStore } from '../../stores/CurrentMapUserListStore';
import { mainMapEditorStore } from '../../stores/MapEditorStore';

const MapEditorElement = styled.div`
    margin-left: 6px;
`;

export const MapUserOverview: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const { username } = editorStore;
    const { currentMapStore } = mainMapEditorStore;
    const { hasCurrentMap } = currentMapStore;

    return (
        <>
            <MenuCard>
                <MenuCardLabel>{t("editor.user")}</MenuCardLabel>
                <>
                    <input
                        type="text"
                        value={username}
                        placeholder={t("editor.username")}
                        onChange={e => undoableSetUsername(e.target.value)}
                    />
                </>
            </MenuCard>
            {hasCurrentMap && (currentMapStore.currentMapId === currentMapUserListStore.currentMapId) && (
                <MenuCard>
                    <MenuCardLabel>{t("editor.current_map_username_list")}:</MenuCardLabel>
                    {currentMapUserListStore.currentMapUserList.map(user =>
                        <MapEditorElement key={user.userId}>
                            <FaUserCheck />&nbsp;
                            {user.username}
                        </MapEditorElement>
                    )}
                </MenuCard>
            )}
        </>
    );
});
