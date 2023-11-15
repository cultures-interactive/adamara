import React, { } from 'react';
import { UseItemTriggerActionModel, ActionModel, CommentActionModel, MoveMapElementActionModel, MovePlayerActionModel, LooseItemActionModel, FinishQuestActionModel, ReceiveAwarenessActionModel, ReceiveItemActionModel, ReceiveQuestActionModel, ReceiveReputationActionModel, SetTagActionModel, SetVariableActionModel, StartDialogueActionModel, StartFightActionModel, TreeEnterActionModel, TreeExitActionModel, LocationTriggerActionModel, InteractionTriggerActionModel, ConditionTriggerActionModel, ConditionActionModel, TreeParamterActionModel, SetPlayStyleActionModel, TreePropertiesActionModel, playStyles, AbortQuestActionModel, ReceiveTaskActionModel, FinishTaskActionModel, AbortTaskActionModel, ResetAreaActionModel, ModifyPlayerHealthModel, TossCoinActionModel, CalculateVariableActionModel, ShowTextActionModel, ShowImageActionModel, StartTimerActionModel, PlayAnimationActionModel, DebugStartActionModel, StartActActionModel, SetReputationStatusActionModel, TriggerDamageInAreaActionModel, StopMapElementActionModel, SetPlayerInputActionModel, SetCameraActionModel, ShakeCameraActionModel, FadeCameraActionModel, SimpleCutSceneActionModel, SetEmergencyLightingActionModel, PlaySoundActionModel, DeactivateNodeGroupActionModel, CopyAwarenessIntoVariableActionModel } from '../../../shared/action/ActionModel';
import { ActionTreeModel } from '../../../shared/action/ActionTreeModel';
import { ImBubble, ImEnter, ImExit, ImVideoCamera } from 'react-icons/im';
import { FaAlignJustify, FaBolt, FaBriefcaseMedical, FaHouzz, FaQuestion, FaQuestionCircle, FaSkull, FaTag, FaUserShield, FaWalking } from 'react-icons/fa';
import { MdCheckBoxOutlineBlank, MdErrorOutline, MdIndeterminateCheckBox, MdLibraryAdd, MdLibraryAddCheck, MdMovie, MdCheckBox, MdAnimation, MdOutlineNotStarted, MdGradient, MdOutlineDarkMode, MdCleaningServices } from 'react-icons/md';
import { HiVariable } from 'react-icons/hi';
import { BsAlarm, BsBraces, BsCalculator, BsCardText, BsCoin, BsFillPersonLinesFill, BsFillPersonPlusFill, BsImage, BsMenuButtonWide, BsBagPlus, BsBagDash, BsStopCircle, BsPlayCircle, BsBagFill } from 'react-icons/bs';
import { GiCrossedSwords, GiFireRing, GiTheaterCurtains, GiVibratingBall } from 'react-icons/gi';
import { GrStatusInfo, GrTree } from 'react-icons/gr';
import { MapElementReferenceModel } from "../../../shared/action/MapElementReferenceModel";
import { ConditionModel, ConditionType } from "../../../shared/action/ConditionModel";
import { AiFillSound } from 'react-icons/ai';
import { BiCommentDetail, BiCopyAlt } from 'react-icons/bi';

// The order here is the order used when showing the nodes for dragging in the editor
export const actionModelPrototypes = [
    new TreeParamterActionModel({}),
    new TreeEnterActionModel({}),
    new TreeExitActionModel({}),
    new LocationTriggerActionModel({}),
    new InteractionTriggerActionModel({}),
    new ConditionTriggerActionModel({}),
    new UseItemTriggerActionModel({}),
    new StartDialogueActionModel({}),
    new ShowTextActionModel({}),
    new ShowImageActionModel({}),
    new StartTimerActionModel({}),
    new StartActActionModel({}),
    new SetReputationStatusActionModel({}),
    new SetVariableActionModel({}),
    new CopyAwarenessIntoVariableActionModel({}),
    new CalculateVariableActionModel({}),
    new SetPlayStyleActionModel({}),
    new SetTagActionModel({}),
    new ReceiveReputationActionModel({}),
    new ReceiveAwarenessActionModel({}),
    new ReceiveItemActionModel({}),
    new LooseItemActionModel({}),
    new ReceiveQuestActionModel({}),
    new FinishQuestActionModel({}),
    new AbortQuestActionModel({}),
    new ReceiveTaskActionModel({}),
    new ReceiveTaskActionModel({ location: new MapElementReferenceModel({}) }),
    new FinishTaskActionModel({}),
    new AbortTaskActionModel({}),
    new ModifyPlayerHealthModel({}),
    new ResetAreaActionModel({}),
    new StartFightActionModel({}),
    new TriggerDamageInAreaActionModel({}),
    new MoveMapElementActionModel({}),
    new StopMapElementActionModel({}),
    new MovePlayerActionModel({}),
    new PlayAnimationActionModel({}),
    new PlaySoundActionModel({}),
    new ConditionActionModel({}),
    new ConditionActionModel({ condition: new ConditionModel({ conditionType: ConditionType.PlayStyle, variableName: playStyles[1], value: "1" }) }),
    new TossCoinActionModel({}),
    new SetPlayerInputActionModel({}),
    new SetCameraActionModel({}),
    new ShakeCameraActionModel({}),
    new FadeCameraActionModel({}),
    new SimpleCutSceneActionModel({}),
    ActionTreeModel.createEmptyPrototype(),
    new DebugStartActionModel({}),
    new SetEmergencyLightingActionModel({}),
    new DeactivateNodeGroupActionModel({}),
    new CommentActionModel({})
];

export const actionNodeIcon = (action: ActionModel) => {
    if (action instanceof AbortQuestActionModel) return <MdErrorOutline />;
    if (action instanceof AbortTaskActionModel) return <MdIndeterminateCheckBox />;
    if (action instanceof CalculateVariableActionModel) return <BsCalculator />;
    if (action instanceof CommentActionModel) return <BiCommentDetail />;
    if (action instanceof ConditionActionModel) return <FaQuestion />;
    if (action instanceof ConditionTriggerActionModel) return <FaQuestionCircle />;
    if (action instanceof FinishQuestActionModel) return <MdLibraryAddCheck />;
    if (action instanceof FinishTaskActionModel) return <MdCheckBox />;
    if (action instanceof InteractionTriggerActionModel) return <FaBolt />;
    if (action instanceof MovePlayerActionModel) return <FaWalking />;
    if (action instanceof LocationTriggerActionModel) return <FaHouzz />;
    if (action instanceof ModifyPlayerHealthModel) return <FaBriefcaseMedical />;
    if (action instanceof MoveMapElementActionModel) return <BsPlayCircle />;
    if (action instanceof StopMapElementActionModel) return <BsStopCircle />;
    if (action instanceof ReceiveAwarenessActionModel) return <BsFillPersonPlusFill />;
    if (action instanceof ReceiveItemActionModel) return <BsBagPlus />;
    if (action instanceof LooseItemActionModel) return <BsBagDash />;
    if (action instanceof UseItemTriggerActionModel) return <BsBagFill />;
    if (action instanceof ReceiveQuestActionModel) return <MdLibraryAdd />;
    if (action instanceof ReceiveReputationActionModel) return <BsFillPersonLinesFill />;
    if (action instanceof ReceiveTaskActionModel) return <MdCheckBoxOutlineBlank />;
    if (action instanceof ResetAreaActionModel) return <FaSkull />;
    if (action instanceof SetPlayStyleActionModel) return <FaUserShield />;
    if (action instanceof SetTagActionModel) return <FaTag />;
    if (action instanceof SetVariableActionModel) return <HiVariable />;
    if (action instanceof CopyAwarenessIntoVariableActionModel) return <BiCopyAlt />;
    if (action instanceof ShowImageActionModel) return <BsImage />;
    if (action instanceof ShowTextActionModel) return <BsCardText />;
    if (action instanceof StartDialogueActionModel) return <ImBubble />;
    if (action instanceof StartFightActionModel) return <GiCrossedSwords />;
    if (action instanceof StartTimerActionModel) return <BsAlarm />;
    if (action instanceof StartActActionModel) return <GiTheaterCurtains />;
    if (action instanceof SetReputationStatusActionModel) return <GrStatusInfo />;
    if (action instanceof TossCoinActionModel) return <BsCoin />;
    if (action instanceof PlayAnimationActionModel) return <MdAnimation />;
    if (action instanceof PlaySoundActionModel) return <AiFillSound />;
    if (action instanceof DebugStartActionModel) return <MdOutlineNotStarted />;
    if (action instanceof TreeEnterActionModel) return <ImEnter />;
    if (action instanceof TreeExitActionModel) return <ImExit />;
    if (action instanceof TreeParamterActionModel) return <BsBraces />;
    if (action instanceof TreePropertiesActionModel) return <GrTree />;
    if (action instanceof SetPlayerInputActionModel) return <BsMenuButtonWide />;
    if (action instanceof SetCameraActionModel) return <ImVideoCamera />;
    if (action instanceof ShakeCameraActionModel) return <GiVibratingBall />;
    if (action instanceof FadeCameraActionModel) return <MdGradient />;
    if (action instanceof SimpleCutSceneActionModel) return <MdMovie />;
    if (action instanceof SetEmergencyLightingActionModel) return <MdOutlineDarkMode />;
    if (action instanceof DeactivateNodeGroupActionModel) return <MdCleaningServices />;
    if (action instanceof TriggerDamageInAreaActionModel) return <GiFireRing />;
    return <FaAlignJustify />;
};
