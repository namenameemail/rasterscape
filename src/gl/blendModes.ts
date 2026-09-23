import {ECompositeOperation} from '../store/compositeOperations'

export const BLEND_MODE_ID: Record<ECompositeOperation, number> = {
    [ECompositeOperation.SourceOver]: 0,
    [ECompositeOperation.DestinationOut]: 1,
    [ECompositeOperation.SourceAtop]: 2,
    [ECompositeOperation.DestinationOver]: 3,
    [ECompositeOperation.Lighter]: 4,
    [ECompositeOperation.Xor]: 5,
    [ECompositeOperation.multiply]: 6,
    [ECompositeOperation.screen]: 7,
    [ECompositeOperation.overlay]: 8,
    [ECompositeOperation.darken]: 9,
    [ECompositeOperation.lighten]: 10,
    [ECompositeOperation.colorDodge]: 11,
    [ECompositeOperation.colorBurn]: 12,
    [ECompositeOperation.hardLight]: 13,
    [ECompositeOperation.softLight]: 14,
    [ECompositeOperation.difference]: 15,
    [ECompositeOperation.exclusion]: 16,
    [ECompositeOperation.hue]: 17,
    [ECompositeOperation.saturation]: 18,
    [ECompositeOperation.color]: 19,
    [ECompositeOperation.luminosity]: 20,
}

export const blendModeId = (mode?: ECompositeOperation | null): number =>
    mode == null ? BLEND_MODE_ID[ECompositeOperation.SourceOver] : BLEND_MODE_ID[mode]
