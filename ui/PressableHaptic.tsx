/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import React from "react"
import {Haptics, ImpactStyle, NotificationType} from "@capacitor/haptics"

type HapticFeedbackType =
    | "impactLight"
    | "impactMedium"
    | "impactHeavy"
    | "selection"
    | "notificationSuccess"
    | "notificationWarning"
    | "notificationError"

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onPress?: React.PointerEventHandler<HTMLButtonElement>
    hapticType?: HapticFeedbackType
}

const PressableHaptic: React.FunctionComponent<Props> = ({children, onPress, hapticType = "impactMedium", ...props}) => {
    const triggerHaptic = async () => {
        switch (hapticType) {
            case "impactLight":
                await Haptics.impact({style: ImpactStyle.Light})
                break
            case "impactMedium":
                await Haptics.impact({style: ImpactStyle.Medium})
                break
            case "impactHeavy":
                await Haptics.impact({style: ImpactStyle.Heavy})
                break
            case "selection":
                await Haptics.selectionChanged()
                break
            case "notificationSuccess":
                await Haptics.notification({type: NotificationType.Success})
                break
            case "notificationWarning":
                await Haptics.notification({type: NotificationType.Warning})
                break
            case "notificationError":
                await Haptics.notification({type: NotificationType.Error})
                break
        }
    }

    const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        triggerHaptic()
        onPress?.(event)
    }

    return (
        <button type="button" onPointerDown={handlePointerDown} {...props}>
            {children}
        </button>
    )
}

export default PressableHaptic