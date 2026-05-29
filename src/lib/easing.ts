import BezierEasing from 'bezier-easing'
import type {EasingType} from '@/types/protocol'

const easingFunctions: Record<EasingType, (t: number) => number> = {
    linear: (t) => t,
    easeIn: BezierEasing(0.42, 0, 1, 1),
    easeOut: BezierEasing(0, 0, 0.58, 1),
    easeInOut: BezierEasing(0.42, 0, 0.58, 1),
    bezier: BezierEasing(0.42, 0, 0.58, 1), // default, overridden per keyframe
}

export function applyEasing(t: number, type: EasingType, handles?: [number, number, number, number]): number {
    if (type === 'bezier' && handles) {
        return BezierEasing(handles[0], handles[1], handles[2], handles[3])(t)
    }
    return easingFunctions[type](t)
}

export const EASING_LABELS: Record<EasingType, string> = {
    linear: 'Linear',
    easeIn: 'Ease In',
    easeOut: 'Ease Out',
    easeInOut: 'Ease In Out',
    bezier: 'Bezier',
}
