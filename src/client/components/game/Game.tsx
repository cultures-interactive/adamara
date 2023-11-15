import React from 'react';
import { EditorClientConnector } from '../editor/EditorClientConnector';
import { EditorNotificationsEditorAndGame } from '../editor/EditorNotifications';
import { EditorGame } from './EditorGame';
import { EditorPopupWindows } from '../editor/EditorPopupWindows';
import { MenuCard } from '../menu/MenuCard';
import { Adjustment, SlideMenu, State } from '../menu/SlideMenu';
import { SettingsMenu } from '../editor/SettingsMenu';

export const Game: React.FunctionComponent = () => {
    return (
        <>
            <EditorClientConnector />
            <EditorPopupWindows />
            <EditorNotificationsEditorAndGame />

            <SlideMenu
                identifier={"settings"}
                orientation={Adjustment.Right}
                start={0}
                state={State.Expanded}
                collapsible={false}
            >
                <MenuCard>
                    <SettingsMenu
                        showNonGameSettings={false}
                    />
                </MenuCard>
            </SlideMenu>

            <EditorGame />
        </>
    );
};
