import React, { } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { GUIHeadlineLight, GUISubBox } from "./GameUIElements";
import styled from "styled-components";
import { notificationController } from "./NotificationController";
import { PastNotificationsItem } from "./PastNotificationsItem";
import { NotificationWindow } from "./NineSlices";

const NotificationContainer = styled(GUISubBox)`
    max-height: 350px;
`;

export const PastNotifications: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const notifications = notificationController.pastNotifications;

    return (
        <NotificationWindow>
            <GUIHeadlineLight>
                {t("game.past_notifications")}
            </GUIHeadlineLight>
            <NotificationContainer>
                {
                    notifications.map(info =>
                        <PastNotificationsItem
                            key={info.id}
                            info={info}
                        />
                    )
                }
            </NotificationContainer >
        </NotificationWindow>
    );
});