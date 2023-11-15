import "./MapDataModel";
import "./MapDataPropertiesModel";
import "./PositionModel";
import "./TileDataModel";
import "./ItemModel";
import "./TranslatedString";
import "./dynamicMapElements/DynamicMapElementNPCModel";
import "../action/ActionModel";
import "../action/ActionPositionModel";
import "../action/ActionTreeModel";
import "../action/ConditionModel";
import "../action/MapElementReferenceModel";
import "../action/NPCReferenceModel";
import "../action/SelectableExitModel";
import "../action/ValueModel";
import "../combat/CombatConfigurationModel";
import "../combat/gestures/CircleGestureModel";
import "../combat/gestures/LineGestureModel";
import "../combat/gestures/GesturePointModel";
import "../resources/ImagePropertiesModel";
import "../resources/PixelPositionModel";
import "../resources/PlaneTransitModel";
import "../resources/SizeModel";
import "../resources/TileAssetModel";
import "./GameDesignVariablesModel";
import "../workshop/WorkshopModel";
import "../translation/MakeshiftTranslationSystemDataModel";

// HACK tw: This file is necessary in the client for now (where we don't actually initialize any of these classes)
// to work around https://github.com/xaviergonz/mobx-keystone/issues/183
// Normally this shouldn't be necessary, but for some reason "importsNotUsedAsValues": "preserve"
// is not working on the client. It is working fine on the server though. I don't know why, so for now, we got this.