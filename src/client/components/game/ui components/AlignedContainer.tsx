import React from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { Direction, DirectionHelper } from "../../../../shared/resources/DirectionHelper";

interface Props {
    direction: Direction;
}

const Container = styled.div`
    display: flex;
    flex-direction: row;
    position: absolute;
    height: 100%;
    width: 100%;
    z-index: 100001;

    &.center {
        align-items: center;
        justify-content: center;
    }
    
    &.south {
        justify-content: center;
        align-items: flex-end;
        bottom: 10px;
    }
    
    &.southwest {
        align-items: flex-end;
        left: 10px;
        bottom: 10px;
    }
    
    &.southeast {
        align-items: flex-end;
        justify-content: flex-end;
        right: 10px;
        bottom: 10px;
    }

    &.west {
        align-items: center;
        justify-content: flex-start;
        left: 10px;
    }
    
    &.northwest {
        align-items: flex-start;
        justify-content: flex-start;
        left: 10px;
        top: 10px;
    }
    
    &.northeast {
        align-items: flex-start;
        justify-content: flex-end;
        right: 10px;
        top: 10px;
    }
    
    &.east {
        align-items: center;
        justify-content: flex-end;
        right: 10px;
    }

    &.north {
        align-items: flex-start;
        justify-content: center;
        top: 10px;
    }

`;

export const AlignedContainer: React.FunctionComponent<Props> = observer(properties => {
    const className = properties.direction != null ? DirectionHelper.getName(properties.direction).toLowerCase() : "center";
    return (
        <Container className={className}>
            {properties.children}
        </Container>
    );
});

