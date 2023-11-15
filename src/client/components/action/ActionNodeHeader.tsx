import React from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { doScale } from "./actionEditorHelpers";
import { Heading1Base } from "../shared/Heading";

interface ScaleProps {
    scale: number;
    truncate?: boolean;
}

const Container = styled.div<ScaleProps>`
    min-height: ${props => doScale(36, props.scale)};
`;

const Header = styled(Heading1Base) <ScaleProps>`
    overflow-x: clip;
    text-overflow: ellipsis;
    padding-left: ${props => doScale(2, props.scale)};
    padding-right: ${props => doScale(5, props.scale)};
    max-width: ${props => doScale(140, props.scale)};
    padding-top: ${props => doScale(2, props.scale)};
    height: ${props => doScale(19.5, props.scale)};
`;

const Description = styled.div<ScaleProps>`
    overflow-x: clip;
    text-overflow: ellipsis;
    padding-left: ${props => doScale(2, props.scale)};
    padding-right: ${props => doScale(2, props.scale)};
    max-width: ${props => props.truncate ? doScale((140), props.scale) : "unset"};
    white-space: ${props => props.truncate ? "nowrap" : "normal"};
`;

interface Props {
    title: string;
    description?: string;
    scale: number;
}

export const ActionNodeHeader: React.FunctionComponent<Props> = observer(({ title, description, scale }) => {
    return (
        <Container scale={scale}>
            <Header scale={scale}>
                {title}
            </Header>
            {description && <Description scale={scale} truncate={true}>
                {description}
            </Description>}
        </Container>
    );
});

interface DescriptionProps {
    description: string;
    scale: number;
}

export const ActionNodeDescription: React.FunctionComponent<DescriptionProps> = observer(({ description, scale }) => {
    return (
        <Container scale={scale}>
            {description && <Description scale={scale}>
                {description}
            </Description>}
        </Container>
    );
});