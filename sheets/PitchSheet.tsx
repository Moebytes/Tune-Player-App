/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import React, {useEffect, useRef, useState} from "react"
import {useSheetSelector, useSheetActions, usePlaybackSelector, usePlaybackActions} from "../store"
import {presentSheet, dismissSheet} from "@capgo/capacitor-sheets/react"
import Slider from "react-slider"
import PressableHaptic from "../ui/PressableHaptic"
import ScalableHaptic from "../ui/ScalableHaptic"
import "./styles/sheet.less"

const PitchSheet: React.FunctionComponent = () => {
    const {showPitchSheet} = useSheetSelector()
    const {setShowPitchSheet} = useSheetActions()
    const {pitch, pitchLFO, pitchLFORate, splitBands, splitBandFreq} = usePlaybackSelector()
    const {setPitch, setPitchLFO, setPitchLFORate, setSplitBands, setSplitBandFreq} = usePlaybackActions()
    const [localPitch, setLocalPitch] = useState(pitch)
    const [localPitchLFO, setLocalPitchLFO] = useState(pitchLFO)
    const [localPitchLFORate, setLocalPitchLFORate] = useState(pitchLFORate)
    const [localSplitBands, setLocalSplitBands] = useState(splitBands)
    const [localSplitBandFreq, setLocalSplitBandFreq] = useState(splitBandFreq)
    const sheet = useRef<HTMLElement>(null)

    useEffect(() => {
        if (showPitchSheet) {
            presentSheet("pitch-sheet")

            setLocalPitch(pitch)
            setLocalPitchLFO(pitchLFO)
            setLocalPitchLFORate(pitchLFORate)
            setLocalSplitBands(splitBands)
            setLocalSplitBandFreq(splitBandFreq)
            
            setShowPitchSheet(false)
        }
    }, [showPitchSheet])

    const reset = () => {
        setLocalPitch(0)
        setLocalPitchLFO(false)
        setLocalPitchLFORate(1)
        setLocalSplitBands(false)
        setLocalSplitBandFreq(500)
    }

    const apply = () => {
        setPitch(localPitch)
        setPitchLFO(localPitchLFO)
        setPitchLFORate(localPitchLFORate)
        setSplitBands(localSplitBands)
        setSplitBandFreq(localSplitBandFreq)

        dismissSheet("pitch-sheet")
    }

    const getLFORate = () => {
        if (localPitchLFORate === 5) return "1/1"
        if (localPitchLFORate === 4) return "1/2"
        if (localPitchLFORate === 3) return "1/4"
        if (localPitchLFORate === 2) return "1/8"
        if (localPitchLFORate === 1) return "1/16"
        if (localPitchLFORate === 0) return "1/32"
        return "1/16"
    }

    return (
        <cap-sheet id="pitch-sheet" ref={sheet} content-placement="bottom">
            <cap-sheet-view>
                <cap-sheet-backdrop/>
                <cap-sheet-content className="sheet">
                    <div className="sheet-solid-background"/>
                    <div className="sheet-row">
                        <span className="sheet-title">Pitch</span>
                    </div>
                    <div className="sheet-row">
                        <span className="sheet-big-text">{localPitch >= 0 ? `+${localPitch}` : localPitch} semitones</span>
                    </div>
                    <div className="sheet-row">
                        <div className="sheet-slider-container">
                            <Slider className="sheet-slider" trackClassName="sheet-slider-track" thumbClassName="sheet-slider-handle"
                            min={-24} max={24} step={1} onChange={(value: number) => setLocalPitch(value)} value={localPitch}/>

                            <div className="sheet-slider-text-container">
                                <span className="sheet-slider-text">-24</span> 
                                <span className="sheet-slider-text">+24</span>
                            </div>
                        </div>
                    </div>
                    <div className="sheet-row">
                        <div className="sheet-button-container">
                            <PressableHaptic onPress={() => setLocalPitch(-12)}>
                                <button className="sheet-button2" aria-pressed={localPitch === -12}>-12</button>
                            </PressableHaptic>
                            <PressableHaptic onPress={() => setLocalPitch(-7)}>
                                <button className="sheet-button2" aria-pressed={localPitch === -7}>-7</button>
                            </PressableHaptic>
                            <PressableHaptic onPress={() => setLocalPitch(0)}>
                                <button className="sheet-button2" aria-pressed={localPitch === 0}>0</button>
                            </PressableHaptic>
                            <PressableHaptic onPress={() => setLocalPitch(7)}>
                                <button className="sheet-button2" aria-pressed={localPitch === 7}>+7</button>
                            </PressableHaptic>
                            <PressableHaptic onPress={() => setLocalPitch(12)}>
                                <button className="sheet-button2" aria-pressed={localPitch === 12}>+12</button>
                            </PressableHaptic>
                        </div>
                    </div>
                    <div className="sheet-row">
                        <div className="sheet-mini-container">
                            <span className="sheet-checkbox-text">LFO?</span> 
                            <PressableHaptic onPress={() => setLocalPitchLFO(!localPitchLFO)}>
                                <input className="sheet-checkbox" type="checkbox" checked={localPitchLFO}/>
                            </PressableHaptic>

                            <Slider className="sheet-mini-slider" trackClassName="sheet-mini-slider-track" thumbClassName="sheet-mini-slider-handle"
                            min={0} max={5} step={1} onChange={(value: number) => setLocalPitchLFORate(value)} value={localPitchLFORate}/>
                            <span className="sheet-mini-slider-text">{getLFORate()}</span> 
                        </div>
                    </div>
                    <div className="sheet-row">
                        <div className="sheet-mini-container">
                            <span className="sheet-checkbox-text">Multiband?</span> 
                            <PressableHaptic onPress={() => setLocalSplitBands(!localSplitBands)}>
                                <input className="sheet-checkbox" type="checkbox" checked={localSplitBands}/>
                            </PressableHaptic>

                            <Slider className="sheet-mini-slider" trackClassName="sheet-mini-slider-track" thumbClassName="sheet-mini-slider-handle"
                            min={0} max={1000} step={1} onChange={(value: number) => setLocalSplitBandFreq(value)} value={localSplitBandFreq}/>
                            <span className="sheet-mini-slider-text">{localSplitBandFreq}Hz</span> 
                        </div>
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

export default PitchSheet