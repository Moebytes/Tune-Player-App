/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import React, {useRef, useState} from "react"
import {Haptics, ImpactStyle, NotificationType} from "@capacitor/haptics"

type HapticFeedbackType =
    | "impactLight"
    | "impactMedium"
    | "impactHeavy"
    | "selection"
    | "notificationSuccess"
    | "notificationWarning"
    | "notificationError"

interface RenderProps {
    pressed: boolean
    colorAnim: number
}

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "style" | "color"> {
    children?: React.ReactNode | ((props: RenderProps) => React.ReactNode)
    icon?: React.ComponentType<{
        width: number
        height: number
        color: string
    }>
    size?: number
    color?: string
    activeColor?: string
    scaleFactor?: number
    containerStyle?: React.CSSProperties
    style?: React.CSSProperties
    hapticType?: HapticFeedbackType
    longPressDelay?: number
    onPress?: React.PointerEventHandler<HTMLButtonElement>
    onPressIn?: (event: React.PointerEvent<HTMLButtonElement>) => void
    onPressOut?: (event: React.PointerEvent<HTMLButtonElement>) => void
}

const ScalableHaptic: React.FunctionComponent<Props> = ({children, onPressIn,
    onPressOut, onPress, longPressDelay = 500, onBlur, icon: Icon, size = 0, color = "", activeColor, 
    scaleFactor = 0.85, containerStyle, style, hapticType = "impactMedium", ...props}) => {
    const [pressed, setPressed] = useState(false)
    const pressedRef = useRef(false)
    const pressStartRef = useRef(0)
    const pointerIdRef = useRef<number | null>(null)

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

    const pressIn = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (pressedRef.current || props.disabled) return
        pressedRef.current = true
        pointerIdRef.current = event.pointerId
        pressStartRef.current = performance.now()

        setPressed(true)
        triggerHaptic()
        onPressIn?.(event)
    }

    const pressOut = (event: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
        if (!pressedRef.current || pointerIdRef.current !== event.pointerId) return
        const duration = performance.now() - pressStartRef.current

        pressedRef.current = false
        pointerIdRef.current = null
        setPressed(false)
        onPressOut?.(event)

        if (!cancelled && duration < longPressDelay && !props.disabled) {
            onPress?.(event)
        }
    }

    return (
        <button type="button" {...props}
            onPointerDown={(event) => {
                if (event.button === 0 && !props.disabled) {
                    event.currentTarget.setPointerCapture(event.pointerId)
                    pressIn(event)
                }
            }}
            onPointerUp={(event) => pressOut(event)}
            onPointerCancel={(event) => pressOut(event, true)}
            onLostPointerCapture={(event) => pressOut(event, true)}
            onBlur={(event) => {
                pressedRef.current = false
                pointerIdRef.current = null
                setPressed(false)
                onBlur?.(event)
            }}
            style={{
                border: "none", background: "transparent",
                padding: 10, margin: -10, cursor: "pointer",
                touchAction: "manipulation", width: "100%",
                WebkitTapHighlightColor: "transparent",
                ...containerStyle,
            }}>
            <div style={{
                    transform: `scale(${pressed ? scaleFactor : 1})`,
                    transition: "transform 100ms ease",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", ...style,
                }}>
                {Icon && (
                    <Icon width={size} height={size}
                    color={pressed && activeColor ? activeColor : color}/>
                )}
                {typeof children === "function"
                    ? children({pressed, colorAnim: pressed ? 1 : 0})
                    : children}
            </div>
        </button>
    )
}

export default ScalableHaptic