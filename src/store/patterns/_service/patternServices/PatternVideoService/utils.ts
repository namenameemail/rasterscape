import { AppState } from '../../../../index'
import { FxyParams } from '../../../../changeFunctions/functions/fxy'
import { ECFType } from '../../../../changeFunctions/types'

export const getFxyFunctionType = (changeFunctionId: string | null, state: AppState) => {
    if (!changeFunctionId) return null
    switch (state.changeFunctions.functions[changeFunctionId].type) {
        case ECFType.FXY:
            return (state.changeFunctions.functions[changeFunctionId].params as FxyParams).type
            break;
        case ECFType.DEPTH:
            return ECFType.DEPTH
            break;
    }
}