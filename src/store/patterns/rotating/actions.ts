import {PatternAction} from "../pattern/types";
import {RotationValue} from "./types";
import {patternsService} from "../../index";

export enum ERotationAction {
    SET_ROTATION = "pattern/set-rotation",
}

export interface SetRotationAction extends PatternAction {
    rotation: RotationValue
}

export const setRotation = (id: string, rotation: RotationValue) => (dispatch) => {
    patternsService.pattern[id].setRotationAngle(rotation.angle);
    patternsService.pattern[id].setRotationView(rotation.rotateDrawAreaElement);
    dispatch({type: ERotationAction.SET_ROTATION, id, rotation});
};
