/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import React, {useEffect, useRef, useState} from "react"
import {useSheetSelector, useSheetActions, usePlaybackSelector, usePlaybackActions} from "../store"
import {presentSheet, dismissSheet} from "@capgo/capacitor-sheets/react"
import {Clipboard} from "@capacitor/clipboard"
import Slider from "react-slider"
import ScalableHaptic from "../ui/ScalableHaptic"
import functions from "../structures/functions"
import "./styles/sheet.less"

const ABLoopSheet: React.FunctionComponent = () => {
    const {showABLoopSheet} = useSheetSelector()
    const {setShowABLoopSheet} = useSheetActions()
    const {duration, reverse, abloop, loopStart, loopEnd} = usePlaybackSelector()
    const {setABLoop, setLoop, setLoopStart, setLoopEnd} = usePlaybackActions()
    const [localABLoop, setLocalABLoop] = useState(abloop)
    const [localLoopStart, setLocalLoopStart] = useState(loopStart)
    const [localLoopEnd, setLocalLoopEnd] = useState(loopEnd)
    const sheet = useRef<HTMLElement>(null)
    const slider = useRef<Slider>(null)

    useEffect(() => {
        if (showABLoopSheet) {
            Promise.resolve(presentSheet("abloop-sheet"))
                .then(() => slider.current?.resize())

            setLocalABLoop(abloop)
            setLocalLoopStart(loopStart)
            setLocalLoopEnd(loopEnd)

            setShowABLoopSheet(false)
        }
    }, [showABLoopSheet])

    const clear = () => {
        setABLoop(false)
        setLoopStart(0)
        setLoopEnd(100)

        dismissSheet("abloop-sheet")
    }

    const apply = () => {
        if (localABLoop) setLoop(true)
        setABLoop(localABLoop)
        setLoopStart(localLoopStart)
        setLoopEnd(localLoopEnd)

        dismissSheet("abloop-sheet")
    }

    const updateABLoop = (value: number[]) => {
        setLocalABLoop(true)
        setLocalLoopStart(value[0])
        setLocalLoopEnd(value[1])
    }

    const loopStartProgress = () => {
        let percent = localLoopStart / 100
        if (reverse) {
            const secondsProgress = (1-percent) * duration
            return functions.formatSeconds(duration - secondsProgress)
        } else {
            const secondsProgress = percent * duration
            return functions.formatSeconds(secondsProgress)
        }
    }

    const loopEndProgress = () => {
        let percent = localLoopEnd / 100
        if (reverse) {
            const secondsProgress = (1-percent) * duration
            return functions.formatSeconds(duration - secondsProgress)
        } else {
            const secondsProgress = percent * duration
            return functions.formatSeconds(secondsProgress)
        }
    }

    const copyLoop = async () => {
        const region = [localLoopStart, localLoopEnd]
        await Clipboard.write({string: JSON.stringify(region)})
    }

    const pasteLoop = async () => {
        try {
            const {value} = await Clipboard.read()
            const region = JSON.parse(value)

            if (typeof region[0] !== "number" || 
                typeof region[1] !== "number" ||
                region[0] < 0 || region[1] > 100) return

            setLocalABLoop(true)
            setLocalLoopStart(region[0])
            setLocalLoopEnd(region[1])
        } catch {}
    }

    return (
        <cap-sheet id="abloop-sheet" ref={sheet} content-placement="bottom">
            <cap-sheet-view>
                <cap-sheet-backdrop/>
                <cap-sheet-content className="sheet">
                    <div className="sheet-solid-background"/>
                    <div className="sheet-row">
                        <span className="sheet-title">A-B Loop</span>
                    </div>
                    <div className="sheet-row">
                        <div className="sheet-slider-container">
                            <Slider className="ab-slider" trackClassName="ab-slider-track" thumbClassName="ab-slider-thumb"
                            ref={slider} min={0} max={100} step={0.01} value={[localLoopStart, localLoopEnd]}
                            onChange={(value: number[]) => updateABLoop(value)} pearling minDistance={1}/>

                            <div className="sheet-slider-text-container">
                                <span className="sheet-slider-text">{loopStartProgress()}</span> 
                                <span className="sheet-slider-text">{loopEndProgress()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="sheet-row">
                        <div className="sheet-button-container">
                            <ScalableHaptic scaleFactor={0.97} onPress={() => copyLoop()}>
                                <button className="sheet-button3" aria-pressed={true}>Copy Loop</button>
                            </ScalableHaptic>
                            <ScalableHaptic scaleFactor={0.97} onPress={() => pasteLoop()}>
                                <button className="sheet-button3" aria-pressed={true}>Paste Loop</button>
                            </ScalableHaptic>
                        </div>
                    </div>
                    <div className="sheet-row">
                        <ScalableHaptic scaleFactor={0.97} onPress={clear}>
                            <button className="sheet-clear-button">Clear</button>
                        </ScalableHaptic>
                    </div>
                    <div className="sheet-row">
                        <ScalableHaptic scaleFactor={0.97} onPress={apply}>
                            <button className="sheet-apply-button">Apply</button>
                        </ScalableHaptic>
                    </div>
                </cap-sheet-content>
            </cap-sheet-view>
        </cap-sheet>
    )
}

export default ABLoopSheet