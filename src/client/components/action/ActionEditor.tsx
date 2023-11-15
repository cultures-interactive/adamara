import { clone } from 'mobx-keystone';
import { observer } from 'mobx-react-lite';
import React, { DragEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import ReactFlow, { Controls, Edge, FlowElement, Node, OnLoadParams } from 'react-flow-renderer';
import styled from 'styled-components';
import { ActionEdge } from './ActionEdge';
import { ActionNavigator } from './ActionNavigator';
import { ActionDetails } from './ActionDetails';
import { ActionTreeInfo } from './ActionTreeInfo';
import { ActionNode } from './ActionNode';
import { actionSubTreeFocus } from './ActionSubTreeFocus';
import { ActionConnectionLine } from './ActionConnectionLine';
import { lastElement } from '../../../shared/helper/generalHelpers';
import { undoableActionEditorDeselectAction, undoableActionEditorSelectAction } from '../../stores/undo/operation/ActionEditorSelectActionOp';
import { ActionEditorChangeGroup, groupUndoableActionEditorChanges } from '../../stores/undo/operation/ActionEditorSubmitChangesOp';
import { ActionTreeModel, ActionTreeType, getTreeParent } from '../../../shared/action/ActionTreeModel';
import { Adjustment, SlideMenu, State } from "../menu/SlideMenu";
import { CgListTree } from "react-icons/cg";
import { GrInspect } from "react-icons/gr";
import { AiOutlineInteraction, AiOutlineSearch } from "react-icons/ai";
import { UndoRedoSlideMenu } from '../editor/UndoRedoSlideMenu';
import { getEdgeTarget, undoRedoUpdateReactFlowInstance } from '../../stores/undo/operation/actionEditorSupport';
import { UiConstants } from '../../data/UiConstants';
import { globalActionEditorEvents } from './handle/globalActionEditorEvents';
import { ActionSearchMenu } from "./ActionSearchMenu";
import { onScreenActionPositions, hierarchyScale, actionAsNode, exitAsEdge, alignEntriesOnLeft, alignExitsOnRight, configureNewActionInstance, setActionPositionAligned, reverseScaleNumber } from './actionEditorHelpers';
import { actionEditorStore } from '../../stores/ActionEditorStore';
import { sharedStore } from '../../stores/SharedStore';
import { undoableActionEditorCreateSubtrees } from '../../stores/undo/operation/ActionEditorCreateSubtreeOp';
import { runInAction } from 'mobx';
import { localSettingsStore } from '../../stores/LocalSettingsStore';
import { EditorComplexity } from '../../../shared/definitions/other/EditorComplexity';
import { actionModelPrototypes } from './actionNodeData';

const actionDetailsTop = 40;
const navigatorHeight = 260;

const StyledReactFlow = styled.div`
    .react-flow__edges {
        z-index: ${UiConstants.Z_INDEX_ACTION_EDITOR_EDGE};
        filter: drop-shadow(1px 1px 3px rgb(0 0 0 / 20%));
    }
`;

const FullscreenContainer = styled.div`
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
`;

export const ActionEditor: React.FunctionComponent = observer(() => {
    const { currentActionTreeHierarchy, currentActionSubTree } = actionEditorStore;
    const reactFlowWrapper = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null as OnLoadParams);

    useEffect(() => {
        return () => actionEditorStore.clearClickActions();
    }, []);

    if (!currentActionTreeHierarchy || !sharedStore.actionTreesInitialized)
        return null;

    const onElementsConnect = (edge: Edge) => {
        actionEditorStore.clearClickActions();

        const fromIndex = parseInt(edge.sourceHandle.substring(1));
        const toIndex = parseInt(edge.targetHandle.substring(1));

        const from = currentActionSubTree.getChildActionById(edge.source);
        let to = currentActionSubTree.getChildActionById(edge.target);
        if (to instanceof ActionTreeModel) {
            to = to.enterActions[toIndex];
        }

        if (!from || !to)
            return;

        groupUndoableActionEditorChanges(ActionEditorChangeGroup.CreateEdge, () => {
            from?.exits()[fromIndex].addNextAction(to.$modelId);
        });
    };

    const onLoad = (reactFlowInstance: OnLoadParams) => {
        setReactFlowInstance(reactFlowInstance);
        undoRedoUpdateReactFlowInstance(reactFlowInstance);
    };

    const onDragOver = (event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const createNode = (event: DragEvent | MouseEvent, actionModelId: string, treeModelId: string) => {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const { x, y } = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });

        const template = sharedStore.actionTreeTemplates.find(t => t.$modelId === treeModelId);
        const source = template
            ? template
            : actionModelPrototypes.find(p => p.$modelId === actionModelId);

        if (source instanceof ActionTreeModel) {
            const { copy: newAction, allNewTrees } = source.cloneWithNewIds(ActionTreeType.SubTree);

            configureNewActionInstance(actionEditorStore.currentActionTreeHierarchy, newAction, x, y);
            const tree = lastElement(actionEditorStore.currentActionTreeHierarchy);
            undoableActionEditorDeselectAction();

            newAction.setParentModelId(tree.$modelId);
            undoableActionEditorCreateSubtrees(allNewTrees);
        } else {
            const newAction = clone(source);

            configureNewActionInstance(actionEditorStore.currentActionTreeHierarchy, newAction, x, y);
            const tree = lastElement(actionEditorStore.currentActionTreeHierarchy);
            undoableActionEditorDeselectAction();

            groupUndoableActionEditorChanges(ActionEditorChangeGroup.CreateActionNode, () => {
                tree.addNonSubtreeAction(newAction);
                alignEntriesOnLeft(newAction, tree);
                alignExitsOnRight(newAction, tree);
            });
        }
    };

    const onDrop = (event: DragEvent) => {
        event.preventDefault();

        const actionModelId = event.dataTransfer.getData('application/newAction');
        const treeModelId = event.dataTransfer.getData('application/newTemplateInstance');

        createNode(event, actionModelId, treeModelId);
    };

    const onClick = (event: MouseEvent<any>) => {
        if ((event.target as any).className !== "react-flow__pane")
            return;

        const { clickPlacementActionModelId: clickPlacementActionNodeModelId, clickPlacementActionTreeModelId } = actionEditorStore;
        if (!clickPlacementActionNodeModelId && !clickPlacementActionTreeModelId)
            return;

        createNode(event, clickPlacementActionNodeModelId, clickPlacementActionTreeModelId);
        actionEditorStore.clearClickActions();
    };

    const moveNode = (node: Node) => {
        if (!node) {
            console.error("moveNode: node was not set: ", node);
            return;
        }

        const action = currentActionSubTree.getChildActionById(node.id);
        const treeHierarchy = actionEditorStore.currentActionTreeHierarchy;
        const { x, y } = onScreenActionPositions(action.position, treeHierarchy);

        const scale = hierarchyScale(treeHierarchy);
        const deltaX = reverseScaleNumber(node.position.x - x, scale);
        const deltaY = reverseScaleNumber(node.position.y - y, scale);

        // snap into sub tree area or increase/decrease area by moving entry and exit points
        const tree = lastElement(treeHierarchy);
        const newX = action.position.x + deltaX;
        const newY = action.position.y + deltaY;
        setActionPositionAligned(action, tree, newX, newY);
        alignEntriesOnLeft(action, tree);
        alignExitsOnRight(action, tree);
    };

    const onNodeDragStop = (_: MouseEvent, node: Node) => {
        groupUndoableActionEditorChanges(ActionEditorChangeGroup.MoveActionNode, () => {
            moveNode(node);
        });
    };

    const onNodeGroupDragStop = (_: MouseEvent, nodes: Node[]) => {
        const nodesByChangedActionTree = new Map<ActionTreeModel, Array<Node>>();
        for (const node of nodes) {
            const action = currentActionSubTree.getChildActionById(node.id);
            const treeContext = (action instanceof ActionTreeModel)
                ? action
                : getTreeParent(action);

            let groupedNodes = nodesByChangedActionTree.get(treeContext);
            if (!groupedNodes) {
                groupedNodes = new Array<Node>();
                nodesByChangedActionTree.set(treeContext, groupedNodes);
            }

            groupedNodes.push(node);
        }

        runInAction(() => {
            for (const groupedNodes of nodesByChangedActionTree.values()) {
                groupUndoableActionEditorChanges(ActionEditorChangeGroup.MoveActionNode, () => {
                    groupedNodes.forEach(node => moveNode(node));
                });
            }
        });
    };

    const selectAction = (_: MouseEvent, node: Node) => {
        const action = currentActionSubTree?.getChildActionById(node.id);
        if (action) {
            undoableActionEditorSelectAction(action);
        }
    };

    let firstMoveOnRerender = true;

    const onMove = () => {
        // NOTE tw: onMove is always called immediately after rerendering. There have been several instances of the ActionEditor
        // freezing in the past, and in one of these instances I observed a rerendering and onMove being constantly triggered. I
        // cannot be *sure* that onMove itself was causing the rerendering but it seems likely, so let's skip this automatic (and
        // probably unnecessary) onMove call for now.
        if (firstMoveOnRerender) {
            firstMoveOnRerender = false;
            return;
        }

        globalActionEditorEvents.emit("onMove");

        if (!reactFlowInstance)
            return;

        const reactFlowState = reactFlowInstance.toObject();
        const reactFlowBounds = (reactFlowWrapper.current as Element)?.getBoundingClientRect();
        if (!reactFlowBounds)
            return;

        const currentTreeHierarchy = actionSubTreeFocus.focusedActionSubTreeHierarchy(actionEditorStore.currentRootActionTree,
            reactFlowState.zoom, reactFlowState.position[0], reactFlowState.position[1], reactFlowBounds.width, reactFlowBounds.height);
        actionEditorStore.setSelectedActionTreeHierarchy(currentTreeHierarchy);
    };

    let nodesAndEdge: FlowElement[] = [actionAsNode(actionEditorStore.currentRootActionTree, [])];
    for (let i = 0; i < currentActionTreeHierarchy.length; i++) {
        const tree = currentActionTreeHierarchy[i];
        const hierarchy = currentActionTreeHierarchy.slice(0, i + 1);

        const actions = tree.allActions.map((a) => actionAsNode(a, hierarchy));
        nodesAndEdge = nodesAndEdge.concat(actions);

        const edges = tree.allActions.map(from => from.exits().map((exit, index) => exit.nextActions.map(to =>
            exitAsEdge(from, index, getEdgeTarget(from, to), hierarchy)))).flat(2).filter(edge => edge != null);
        nodesAndEdge = nodesAndEdge.concat(edges);
    }

    let zoomAndPosition = actionSubTreeFocus.getZoomAndPosition(actionEditorStore.currentRootActionTree);

    if (!zoomAndPosition) {
        const position = actionEditorStore.currentRootActionTree.position;
        const initZoom = 5;
        zoomAndPosition = {
            zoom: (1 / actionEditorStore.actionEditorUpscaleFactor) * initZoom,
            x: 100 - (position.x * initZoom),
            y: 100 - (position.y * initZoom),
            canvasWidth: null,
            canvasHeight: null
        };
    }

    if (reactFlowInstance) {
        reactFlowInstance.setTransform(zoomAndPosition);
    }

    return (
        <FullscreenContainer ref={reactFlowWrapper}>
            <StyledReactFlow as={ReactFlow}
                elements={nodesAndEdge}
                onConnect={onElementsConnect}
                onLoad={onLoad}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeDragStart={selectAction}
                onElementClick={selectAction}
                onNodeDragStop={onNodeDragStop}
                onSelectionDragStop={onNodeGroupDragStop}
                onMove={onMove}
                onClick={onClick}
                maxZoom={10}
                minZoom={4 / actionEditorStore.actionEditorUpscaleFactor}
                defaultZoom={zoomAndPosition?.zoom}
                defaultPosition={[zoomAndPosition?.x, zoomAndPosition?.y]}
                onlyRenderVisibleElements={true}
                connectionLineComponent={
                    ActionConnectionLine
                }
                nodeTypes={{
                    ActionNode: ActionNode
                }}
                edgeTypes={{
                    ActionEdge: ActionEdge
                }}
            >
                <Controls showInteractive={false} />

                <UndoRedoSlideMenu />

                {localSettingsStore.editorComplexity === EditorComplexity.Production && (
                    <>
                        <SlideMenu
                            identifier={"action-tree"}
                            orientation={Adjustment.Left}
                            start={40}
                            icon={<CgListTree />}
                            state={State.Expanded}
                            collapsible={true}
                        >
                            <ActionTreeInfo />
                        </SlideMenu>

                        <SlideMenu
                            identifier={"action-search"}
                            orientation={Adjustment.Left}
                            start={130}
                            state={State.Collapsed}
                            collapsible={true}
                            icon={<AiOutlineSearch />}
                        >
                            <ActionSearchMenu property={true} />
                        </SlideMenu>
                    </>
                )}

                <SlideMenu
                    identifier={"action-navigator"}
                    orientation={Adjustment.Bottom}
                    start={50}
                    maxHeight={navigatorHeight}
                    icon={<AiOutlineInteraction />}
                    state={State.Expanded}
                    collapsible={true}>
                    <ActionNavigator />
                </SlideMenu>

                {actionEditorStore.currentAction && (
                    <SlideMenu
                        identifier={"action-details"}
                        orientation={Adjustment.Right}
                        start={actionDetailsTop}
                        maxHeight={`calc(100vh - ${actionDetailsTop}px - ${navigatorHeight}px)`}
                        icon={<GrInspect />}
                        state={State.Expanded}
                        collapsible={true}
                        containerOverflow={"visible"}
                        ignorePersistedExpansionState={true}
                        notAnimated={true}
                        onUserToggle={undoableActionEditorDeselectAction}
                    >
                        <ActionDetails />
                    </SlideMenu>
                )}
            </StyledReactFlow>
        </FullscreenContainer>
    );
});
