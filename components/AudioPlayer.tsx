/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import React, {useEffect, useEffectEvent, useState, useRef} from "react"
import {flushSync} from "react-dom"
import {usePlaybackSelector, usePlaybackActions} from "../store"
import {Capacitor} from "@capacitor/core"
import {Share} from "@capacitor/share"
import {Preferences} from "@capacitor/preferences"
import {Filesystem, Directory} from "@capacitor/filesystem"
import {Buffer} from "buffer"
import Slider from "react-slider"
import * as Tone from "tone"
import {Midi} from "@tonejs/midi"
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js"
import functions from "../structures/functions"
import audio from "../structures/audio"
import engine, {audioReady} from "../structures/audioEngine"
import type {AudioCommand} from "../structures/audio"
import type {SongItem} from "../structures/functions"
import PlayIcon from "../assets/svg/play.svg"
import PauseIcon from "../assets/svg/pause.svg"
import ReverseIcon from "../assets/svg/reverse.svg"
import SpeedIcon from "../assets/svg/speed.svg"
import PitchIcon from "../assets/svg/pitch.svg"
import LoopIcon from "../assets/svg/loop.svg"
import ABLoopIcon from "../assets/svg/abloop.svg"
import RevertIcon from "../assets/svg/revert.svg"
import VolumeIcon from "../assets/svg/volume.svg"
import VolumeLowIcon from "../assets/svg/volume-low.svg"
import VolumeMuteIcon from "../assets/svg/volume-mute.svg"
import PrevIcon from "../assets/svg/prev.svg"
import NextIcon from "../assets/svg/next.svg"
import CheckboxIcon from "../assets/svg/checkbox.svg"
import CheckboxCheckedIcon from "../assets/svg/checkbox-checked.svg"
import placeholder from "../assets/images/placeholder.png"
import midiPlaceholder from "../assets/images/midi-placeholder.png"
import {useFlagSelector, useFlagActions, useSheetActions} from "../store"
import ScalableHaptic from "../ui/ScalableHaptic"
import "./styles/audioplayer.less"

let timer = null as any

const AudioPlayer: React.FunctionComponent = (props) => {
    const {
        reverse, pitch, speed, volume, muted, loop, abloop,
        loopStart, loopEnd, preservesPitch, duration, song, songName,
        songCover, songUrl, editCode, download, playHover,
        volumeHover, sampleRate, reverbMix, reverbDecay, delayMix, delayTime,
        delayFeedback, phaserMix, phaserFrequency, lowpassCutoff, highpassCutoff, filterResonance,
        filterSlope, highshelfCutoff, highshelfGain, lowshelfCutoff, lowshelfGain, midi,
        midiFile, midiDuration, bpm, wave, basicWave, waveType,
        attack, decay, sustain, release, poly, portamento,
        mouseFlag, savedLoop, pitchLFO, pitchLFORate, stepFlag, splitBands,
        splitBandFreq, previousVolume, paused, seekTo, secondsProgress, progress,
        dragProgress, dragging, abDragging
    } = usePlaybackSelector()
    const {
        setReverse, setPitch, setSpeed, setVolume, setMuted, setLoop, setABLoop,
        setLoopStart, setLoopEnd, setPreservesPitch, setDuration, setSong, setCurrentSong, setSongName,
        setSongCover, setSongUrl, setEditCode, setDownload, setPlayHover,
        setVolumeHover, setSampleRate, setReverbMix, setReverbDecay, setDelayMix, setDelayTime,
        setDelayFeedback, setPhaserMix, setPhaserFrequency, setLowpassCutoff, setHighpassCutoff, setFilterResonance,
        setFilterSlope, setHighshelfCutoff, setHighshelfGain, setLowshelfCutoff, setLowshelfGain, setMidi,
        setMidiFile, setMidiDuration, setBpm, setWave, setBasicWave, setWaveType,
        setAttack, setDecay, setSustain, setRelease, setPoly, setPortamento,
        setMouseFlag, setSavedLoop, setPitchLFO, setPitchLFORate, setStepFlag, setSplitBands,
        setSplitBandFreq, setPreviousVolume, setPaused, setSeekTo, setSecondsProgress, setProgress,
        setDragProgress, setDragging, setABDragging
    } = usePlaybackActions()
    const {uploadFlag, playFlag, downloadFlag} = useFlagSelector()
    const {setUploadFlag, setPlayFlag, setDownloadFlag, setRecentFlag} = useFlagActions()
    const {setShowSpeedSheet, setShowPitchSheet, setShowABLoopSheet} = useSheetActions()
    const [effects, setEffects] = useState([] as {type: string, node: Tone.ToneAudioNode}[])
    const [showSpeedPopup, setShowSpeedPopup] = useState(false)
    const [showPitchPopup, setShowPitchPopup] = useState(false)
    const [synthLoaded, setSynthLoaded] = useState(false)
    const loadRequest = useRef(0)
    const playbackURL = useRef("")
    const currentSong = useRef("")
    const skipping = useRef(false)
    const playbackRequest = useRef(0)

    const progressBar = useRef(null) as any
    const volumeBar = useRef(null) as any
    const speedBar = useRef(null) as any
    const pitchBar = useRef(null) as any
    const pitchLFOBar = useRef(null) as any
    const pitchBandBar = useRef(null) as any
    const speedPopup = useRef<HTMLDivElement>(null)
    const speedIcon = useRef<HTMLDivElement>(null)
    const pitchPopup = useRef<HTMLDivElement>(null)
    const pitchIcon = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (uploadFlag) {
            setUploadFlag(null)
            upload(uploadFlag.path, undefined, true, uploadFlag)
        }
    }, [uploadFlag])

    useEffect(() => {
        if (!playFlag) return
        setPlayFlag(null)
        upload(playFlag.songUrl || playFlag.song, playFlag)
    }, [playFlag])

    useEffect(() => {
        if (downloadFlag) {
            downloadSong()
            setDownloadFlag(false)
        }
    }, [downloadFlag])

    useEffect(() => {
        progressBar.current?.resize()
        volumeBar.current?.resize()
        speedBar.current?.resize()
        pitchBar.current?.resize()
        pitchLFOBar.current?.resize()
        pitchBandBar.current?.resize()
    })

    useEffect(() => {
        initState()
    }, [])

    useEffect(() => {
        /*Update Progress*/
        const updateProgress = () => {
            let percent = (Tone.getTransport().seconds / duration)
            if (!Number.isFinite(percent)) return
            if (!dragging) {
                if (reverse) {
                    setProgress((1-percent) * 100)
                    setSecondsProgress(duration - Tone.getTransport().seconds)
                } else {
                    setProgress(percent * 100)
                    setSecondsProgress(Tone.getTransport().seconds)
                }
            }
        }
        const interval = window.setInterval(updateProgress, 100)
        return () => {
            window.clearInterval(interval)
        }
    }, [duration, dragging, reverse, loop, abloop, midi])

    const pauseFromSystem = useEffectEvent(() => {
        playbackRequest.current++
        Tone.getTransport().pause(Tone.immediate())
        if (midi) disposeSynths()
        setPaused(true)
        audio.stopAudio()
        publishNowPlaying()
    })

    const isPlaybackActive = useEffectEvent(() => {
        return !paused || Tone.getTransport().state === "started"
    })

    useEffect(() => {
        return audio.watchPlaybackContext(Tone.getContext(),
        () => isPlaybackActive(), () => pauseFromSystem())
    }, [])

    useEffect(() => {
        const listener = audio.onAudioPause(() => pauseFromSystem())
        return () => { 
            listener.then((handle) => handle.remove()) 
        }
    }, [])

    useEffect(() => {
        if (paused) audio.stopAudio()
    }, [paused])

    const publishNowPlaying = useEffectEvent((artwork?: string, position?: number) => {
        if (!song || duration <= 0) return
        audio.updateNowPlaying({trackID: song, title: songName || "Audio",
            duration, elapsed: position ?? audio.playbackPosition(Tone.getTransport().seconds, duration, reverse),
            rate: Tone.getTransport().state !== "started" || Tone.getContext().state !== "running"
                ? 0 : reverse ? -1 : 1, artwork})
    })

    useEffect(() => {
        if (Capacitor.getPlatform() !== "ios" || !song) return
        publishNowPlaying()
        const timer = window.setInterval(() => publishNowPlaying(), 1000)

        const onVisible = () => publishNowPlaying()
        document.addEventListener("visibilitychange", onVisible)
        return () => {
            window.clearInterval(timer)
            document.removeEventListener("visibilitychange", onVisible)
        }
    }, [song, songName, duration, paused, reverse])

    useEffect(() => {
        if (Capacitor.getPlatform() !== "ios" || !song) return
        let cancelled = false
        const updateNativeArtwork = async () => {
            const artwork = await audio.downloadArtwork(songCover)
            if (!cancelled) publishNowPlaying(artwork)
        }
        updateNativeArtwork().catch((error) => console.warn("Unable to load system player artwork", error))
        return () => { cancelled = true }
    }, [song, songCover])

    const handleAudioCommand = useEffectEvent((command: AudioCommand) => {
        if (command.trackID && command.trackID !== song) return
        if (command.action === "pause") pauseFromSystem()
        if (command.action === "play") play(true)
        if (command.action === "seek" && 
            duration > 0 && Number.isFinite(command.position)) {
            const percent = Math.max(0, Math.min(100, command.position! / duration * 100))
            seek(percent)
        }
    })

    useEffect(() => {
        const listener = audio.onAudioCommand((command) => handleAudioCommand(command))
        return () => { 
            listener.then((handle) => handle.remove()) 
        }
    }, [])

    const releaseMidiNotes = (time: number) => {
        for (const synth of engine.synths as any[]) {
            if (synth.releaseAll) synth.releaseAll(time)
            else synth.envelope.triggerRelease(time)
        }
    }

    useEffect(() => {
        if (loop || abloop || duration <= 0) return
        const transport = Tone.getTransport()

        const event = transport.schedule((time) => {
            releaseMidiNotes(time)
            transport.pause(time)
            setPaused(true)
        }, duration)

        return () => { 
            transport.clear(event) 
        }
    }, [duration, loop, abloop])

    useEffect(() => {
        const onWindowClick = (event: MouseEvent) => {
            const target = event.target as Node
            if (showSpeedPopup && !speedIcon.current?.contains(target)
                && !speedPopup.current?.contains(target)) {
                setShowSpeedPopup(false)
            }

            if (showPitchPopup && !pitchIcon.current?.contains(target)
                && !pitchPopup.current?.contains(target)) {
                setShowPitchPopup(false)
            }
        }

        window.addEventListener("mousedown", onWindowClick)
        return () => {
            window.removeEventListener("mousedown", onWindowClick)
        }
    }, [showPitchPopup, showSpeedPopup])

    useEffect(() => {
        /* Precision on shift click */
        const keyDown = (event: KeyboardEvent) => {
            if (event.shiftKey) {
                event.preventDefault()
                setStepFlag(false)
            }
            /* Play on Spacebar */
            if (event.code === "Space") {
                event.preventDefault()
                play()
            }
            /* Arrow Key Shortcuts */
            if (event.key === "ArrowLeft") {
                event.preventDefault()
                rewind(1)
            }
            if (event.key === "ArrowRight") {
                event.preventDefault()
                fastforward(1)
            }
            if (event.key === "ArrowUp") {
                event.preventDefault()
                updateVolume(volume + 0.05)
            }
            if (event.key === "ArrowDown") {
                event.preventDefault()
                updateVolume(volume - 0.05)
            }
        }

        const keyUp = (event: KeyboardEvent) => {
            if (!event.shiftKey) {
                setStepFlag(true)
            }
        }

        const wheel = (event: WheelEvent) => {
            event.preventDefault()
            const delta = Math.sign(event.deltaY)
            updateVolume(volume - delta * 0.05)
        }

        const mouseDown = () => {
            if (!stepFlag) {
                setStepFlag(true)
            }
        }

        window.addEventListener("keydown", keyDown, {passive: false})
        window.addEventListener("keyup", keyUp)
        window.addEventListener("wheel", wheel, {passive: false})
        window.addEventListener("mousedown", mouseDown)
        return () => {
            window.clearInterval(undefined)
            window.removeEventListener("keydown", keyDown)
            window.removeEventListener("keyup", keyUp)
            window.removeEventListener("wheel", wheel)
            window.removeEventListener("mousedown", mouseDown)
        }
    })

    const initState = async () => {
        const {value: rawState} = await Preferences.get({key: "state"})
        const {value: rawSynthState} = await Preferences.get({key: "synth-state"})
        const saved = rawState ? JSON.parse(rawState) : {}
        const synthSaved = rawSynthState ? JSON.parse(rawSynthState) : {}

        if (saved.preservesPitch !== undefined) {
            setPreservesPitch(Boolean(saved.preservesPitch))
        }
        if (saved.pitchLFO !== undefined) {
            setPitchLFO(Boolean(saved.pitchLFO))
        }
        if (saved.pitchLFORate !== undefined) {
            setPitchLFORate(Number(saved.pitchLFORate))
        }
        if (saved.splitBands !== undefined) {
            setSplitBands(Boolean(saved.splitBands))
        }
        if (saved.splitBandFreq !== undefined) {
            setSplitBandFreq(Number(saved.splitBandFreq))
        }
        if (saved.speed !== undefined) {
            setSpeed(Number(saved.speed))
        }
        if (saved.pitch !== undefined) {
            setPitch(Number(saved.pitch))
        }
        if (saved.reverse !== undefined) {
            setReverse(Boolean(saved.reverse))
        }
        if (saved.volume !== undefined) {
            setVolume(Number(saved.volume))
            Tone.getDestination().volume.value = functions.logSlider(saved.volume)
        }
        if (saved.loop !== undefined) {
            setLoop(Boolean(saved.loop))
        }
        if (saved.abloop !== undefined) setABLoop(Boolean(saved.abloop))
        if (saved.loopStart !== undefined) setLoopStart(Number(saved.loopStart))
        if (saved.loopEnd !== undefined) setLoopEnd(Number(saved.loopEnd))
        if (synthSaved.wave !== undefined) setWave(synthSaved.wave)
        if (synthSaved.basicWave !== undefined) setBasicWave(synthSaved.basicWave)
        if (synthSaved.waveType !== undefined) setWaveType(synthSaved.waveType)
        if (synthSaved.attack !== undefined) setAttack(Number(synthSaved.attack))
        if (synthSaved.decay !== undefined) setDecay(Number(synthSaved.decay))
        if (synthSaved.sustain !== undefined) setSustain(Number(synthSaved.sustain))
        if (synthSaved.release !== undefined) setRelease(Number(synthSaved.release))
        if (synthSaved.poly !== undefined) setPoly(Boolean(synthSaved.poly))
        if (synthSaved.portamento !== undefined) setPortamento(Number(synthSaved.portamento))

        setSynthLoaded(true)
    }

    const refreshState = useEffectEvent(() => {
        const apply = {player: engine.player}
        updatePreservesPitch(preservesPitch)
        updateSpeed(speed)
        updatePitch(pitch)
        updatePitchLFO(pitchLFO)
        pitchBands(splitBands)
        updateReverse(reverse, apply)
    })

    useEffect(() => {
        if (!synthLoaded) return
        Preferences.set({key: "state", value: JSON.stringify({reverse, pitch, speed, preservesPitch, volume,
            pitchLFO, pitchLFORate, splitBands, splitBandFreq, loop, abloop, loopStart, loopEnd})})
    }, [synthLoaded, reverse, pitch, speed, preservesPitch, pitchLFO, pitchLFORate, splitBands, splitBandFreq,
        volume, loop, abloop, loopStart, loopEnd])

    useEffect(() => {
        if (!synthLoaded) return
        Preferences.set({key: "synth-state", value: JSON.stringify({wave, basicWave, waveType,
            attack, decay, sustain, release, poly, portamento})})
    }, [synthLoaded, wave, basicWave, waveType, attack, decay, sustain, release, poly, portamento])

    const removeEffect = (type: string) => {
        const index = effects.findIndex((e) => e?.type === type)
        if (index !== -1) {
            effects[index] = null as any
            setEffects(effects.filter(Boolean))
        }
    }

    const pushEffect = (type: string, node: Tone.ToneAudioNode) => {
        const obj = {type, node}
        const index = effects.findIndex((e) => e?.type === type)
        if (index !== -1) {
            effects[index] = obj
        } else {
            effects.push(obj)
        }
        setEffects(effects)
    }
    
    const applyEffects = useEffectEvent(() => {
        if (!engine.player || !engine.audioNode || !engine.effectNode || !engine.gainNode ||
        !engine.soundtouchNode || !engine.staticSoundtouchNode ||
        !engine.staticSoundtouchNode2 || !engine.lfoNode) return
        engine.player?.disconnect()
        engine.soundtouchNode?.disconnect()
        engine.staticSoundtouchNode?.disconnect()
        engine.staticSoundtouchNode2?.disconnect()
        engine.lfoNode?.disconnect()
        if (engine.synths.length) engine.synths.forEach((s) => s?.disconnect())
        let nodes = effects.map((e) => e?.node)
        nodes = (nodes ?? []).filter(Boolean)
        if (nodes[0]) nodes.forEach((n) => n?.disconnect())
        if (midi) {
            if (engine.synths.length) engine.synths.forEach((s) => s.chain(...[...nodes, engine.gainNode]))
        } else {
            if (pitchLFO) {
                if (splitBands) {
                    const lowband = new Tone.Filter({type: "lowpass", frequency: splitBandFreq, Q: filterResonance, rolloff: getFilterSlope()})
                    const highband = new Tone.Filter({type: "highpass", frequency: splitBandFreq, Q: filterResonance, rolloff: getFilterSlope()})
                    const highbandEffect = new Tone.Filter({type: "highpass", frequency: splitBandFreq, Q: filterResonance, rolloff: getFilterSlope()})
                    engine.audioNode.input = engine.player
                    engine.effectNode.input = engine.player
                    engine.audioNode.input.connect(lowband)
                    engine.audioNode.input.connect(highband)
                    engine.effectNode.input.connect(highbandEffect)

                    lowband.chain(...[engine.staticSoundtouchNode2, ...nodes, engine.audioNode.output])

                    highband.connect(engine.staticSoundtouchNode)
                    highbandEffect.connect(engine.soundtouchNode)
                    engine.staticSoundtouchNode.connect(engine.lfoNode, 0, 0)
                    engine.soundtouchNode.connect(engine.lfoNode, 0, 1)
                    let currentNode = engine.lfoNode
                    for (let i = 0; i < nodes.length; i++) {
                        let node = nodes[i] instanceof Tone.ToneAudioNode ? nodes[i].input : nodes[i]
                        try {
                            currentNode.connect(node)
                            currentNode = nodes[i]
                        } catch {}
                    }
                    currentNode.connect(engine.audioNode.output)
                } else {
                    engine.audioNode.input = engine.player
                    engine.effectNode.input = engine.player
                    engine.audioNode.input.connect(engine.staticSoundtouchNode)
                    engine.effectNode.input.connect(engine.soundtouchNode)
                    engine.staticSoundtouchNode.connect(engine.lfoNode, 0, 0)
                    engine.soundtouchNode.connect(engine.lfoNode, 0, 1)
                    let currentNode = engine.lfoNode
                    for (let i = 0; i < nodes.length; i++) {
                        let node = nodes[i] instanceof Tone.ToneAudioNode ? nodes[i].input : nodes[i]
                        try {
                            currentNode.connect(node)
                            currentNode = nodes[i]
                        } catch {}
                    }
                    currentNode.connect(engine.audioNode.output)
                }
            } else {
                if (splitBands) {
                    const lowband = new Tone.Filter({type: "lowpass", frequency: splitBandFreq, Q: filterResonance, rolloff: getFilterSlope()})
                    const highband = new Tone.Filter({type: "highpass", frequency: splitBandFreq, Q: filterResonance, rolloff: getFilterSlope()})
                    engine.audioNode.input = engine.player
                    engine.audioNode.input.connect(lowband)
                    engine.audioNode.input.connect(highband)
                    lowband.chain(...[engine.staticSoundtouchNode, ...nodes, engine.audioNode.output])
                    highband.chain(...[engine.soundtouchNode, ...nodes, engine.audioNode.output])
                } else {
                    engine.audioNode.input = engine.player
                    engine.audioNode.input.chain(...[engine.soundtouchNode, ...nodes, engine.audioNode.output])
                }
            }
        }
    })

    const disposeSynths = useEffectEvent((synthArray?: any[]) => {
        let array = synthArray ? synthArray : engine.synths
        while (array.length) {
            const synth = array.shift()
            synth?.dispose()
        }
    })

    const switchState = (midi: boolean) => {
        engine.player.unsync()
        if (midi) {
            engine.player.disconnect()
        } else {
            if (engine.synths.length) disposeSynths()
            engine.player.sync().start(0)
        }
    }

    const updateDuration = useEffectEvent(async (value?: number) => {
        if (!engine.lfoNode) return
        if (value) {
            setDuration(value)
        } else {
            if (!midi) {
                setDuration(engine.player.buffer.duration / engine.player.playbackRate)
                const {bpm} = await functions.getBPM(engine.player.buffer.get()!)
                setBpm(bpm)
                engine.lfoNode.parameters.get("bpm").value = bpm
            }
        }
    })

    const checkBuffer = useEffectEvent(() => {
        if (midi) return true
        return Boolean(engine.player?.buffer.loaded)
    })

    const play = useEffectEvent(async (alwaysPlay?: boolean) => {
        if (!checkBuffer()) return
        const transport = Tone.getTransport()
        const contextRunning = Tone.getContext().state === "running"
        if (contextRunning && transport.state === "started") {
            if (alwaysPlay) publishNowPlaying()
            else pauseFromSystem()
            return
        }
        const request = ++playbackRequest.current
        updateDuration()

        if (!loop && !abloop && transport.seconds >= duration) {
            transport.seconds = 0
        }

        try {
            if (!contextRunning) transport.pause(Tone.immediate())
            await Promise.all([
                audio.preparePlayback(songName, Tone.getContext()),
                audioReady
            ])
            if (request !== playbackRequest.current) return
            if (midi) await buildMIDI()
            if (request !== playbackRequest.current) return
            transport.start()
            setPaused(false)
            publishNowPlaying()
        } catch (error) {
            if (request !== playbackRequest.current) return
            pauseFromSystem()
        }
    })

    const stop = () => {
        Tone.getTransport().stop()
    }

    const mute = () => {
        if (muted) {
            setMuted(false)
            Tone.getDestination().mute = false
            setVolume(previousVolume)
            Tone.getDestination().volume.value = functions.logSlider(previousVolume)
        } else {
            setMuted(true)
            Tone.getDestination().volume.value = functions.logSlider(0)
            Tone.getDestination().mute = true
            setVolume(0)
        }
    }

    const updateVolume = (value: number) => {
        if (value > 1) value = 1
        if (value < 0) value = 0
        setPreviousVolume(volume)
        setVolume(value)
        Tone.getDestination().volume.value = functions.logSlider(value)
        if (value <= 0.01) {
            Tone.getDestination().mute = true
            setMuted(true)
        } else {
            Tone.getDestination().mute = false
            setMuted(false)
        }
    }

    const updateSpeed = async (value?: number | string, applyState?: any) => {
        if (!engine.soundtouchNode || (!midi && !engine.player?.buffer.loaded)) return
        const wasPlaying = Tone.getTransport().state === "started"
        Tone.getTransport().pause()
        let currentSpeed = value !== undefined ? Number(value) : speed
        let currentDuration = engine.player.buffer.duration / currentSpeed
        if (midi) {
            await buildMIDI()

            const newDuration = midiDuration / currentSpeed
            setDuration(newDuration)

            if (abloop) {
                applyAB(newDuration)
            } else {
                applyLoopRegion(newDuration)
            }
        } else {
            let currentPlayer = engine.player
            if (applyState) {
                currentPlayer = applyState.player
            }
            currentPlayer.playbackRate = currentSpeed
            const pitchCorrect = preservesPitch ? 1 / currentSpeed : 1
            engine.soundtouchNode.parameters.get("pitch").value = functions.semitonesToScale(pitch) * pitchCorrect
            let percent = Tone.getTransport().seconds / currentDuration
            setDuration(currentDuration)
            let newSeconds = percent * currentDuration
            Tone.getTransport().seconds = Math.min(
                Math.max(newSeconds, 0),
                currentDuration - 0.001
            )
            if (abloop) {
                applyAB(currentDuration)
            } else {
                applyLoopRegion(currentDuration)
            }   
        }
        if (wasPlaying) Tone.getTransport().start()
    }

    useEffect(() => {
        updateSpeed()
    }, [speed, preservesPitch])

    const updatePreservesPitch = (value?: boolean) => {
        setPreservesPitch(value !== undefined ? value : !preservesPitch)
    }

    const updatePitch = async (value?: number | string, applyState?: any) => {
        if (!engine.soundtouchNode) return
        const wasPlaying = Tone.getTransport().state === "started"
        Tone.getTransport().pause()
        let currentPitch = value !== undefined ? Number(value) : pitch
        if (midi) {
            await buildMIDI()
        } else {
            const pitchCorrect = preservesPitch ? 1 / speed : 1
            engine.soundtouchNode.parameters.get("pitch").value = functions.semitonesToScale(currentPitch) * pitchCorrect
        }
        if (wasPlaying) Tone.getTransport().start()
    }

    useEffect(() => {
        updatePitch()
    }, [pitch])

    const updatePitchLFO = (value?: boolean) => {
        setPitchLFO(value !== undefined ? value : !pitchLFO)
    }

    useEffect(() => {
        applyEffects()
    }, [pitch, pitchLFO, pitchLFORate, splitBands, splitBandFreq])

    const updatePitchLFORate = async (value?: number | string) => {
        if (!engine.lfoNode) return
        let currentLFORate = value !== undefined ? Number(value) : pitchLFORate
        engine.lfoNode.parameters.get("lfoRate").value = currentLFORate
        engine.lfoNode.port.postMessage({lfoShape: wave})
    }

    useEffect(() => {
        updatePitchLFORate()
    }, [pitchLFORate, wave])

    const pitchBands = (value?: boolean) => {
        setSplitBands(value !== undefined ? value : !splitBands)
        applyEffects()
    }

    const pitchBandFreq = async (value?: number | string) => {
        setSplitBandFreq(value !== undefined ?  Number(value) : splitBandFreq)
        clearTimeout(timer)
        timer = setTimeout(() => {
            applyEffects()
            timer = null
        }, 100)
    }

    const updateReverse = async (value?: boolean, applyState?: any) => {
        const wasPlaying = Tone.getTransport().state === "started"
        Tone.getTransport().pause()
        let currentReverse = value !== undefined ? value : reverse
        let percent = Tone.getTransport().seconds / duration
        let val = (1-percent) * duration
        if (val < 0) val = 0
        if (val > duration - 1) val = duration - 1
        if (midi) {
            Tone.getTransport().seconds = val
            await buildMIDI()
        } else {
            let currentPlayer = engine.player
            if (applyState) {
                currentPlayer = applyState.player
            }
            if (!applyState) Tone.getTransport().seconds = val
            currentPlayer.reverse = currentReverse
        }
        if (wasPlaying) Tone.getTransport().start()
        applyAB(duration)
    }

    useEffect(() => {
        updateReverse()
    }, [reverse])

    const reset = async () => {
        if (!engine.soundtouchNode && !engine.lfoNode) return
        setReverse(false)
        setPitch(0)
        setSpeed(1)
        setVolume(1)
        setPreviousVolume(1)
        setMuted(false)
        setABLoop(false)
        setLoopStart(0)
        setLoopEnd(100)
        setPreservesPitch(false)
        setDuration(0)
        setEffects([])
        setPlayHover(false)
        setVolumeHover(false)
        setSampleRate(100)
        setReverbMix(0)
        setReverbDecay(1.5)
        setDelayMix(0)
        setDelayTime(0.25)
        setDelayFeedback(0.5)
        setPhaserMix(0)
        setPhaserFrequency(1)
        setLowpassCutoff(100)
        setHighpassCutoff(0)
        setFilterResonance(6)
        setFilterSlope(0)
        setHighshelfCutoff(70)
        setHighshelfGain(0)
        setLowshelfCutoff(30)
        setLowshelfGain(0)
        setMidiDuration(0)
        setBpm(0)
        setWave("square")
        setBasicWave("square")
        setWaveType("basic")
        setAttack(0.02)
        setDecay(0.5)
        setSustain(0.3)
        setRelease(0.5)
        setPoly(true)
        setPortamento(0)
        setMouseFlag(false)
        setSavedLoop([0, 100])
        setPitchLFO(false)
        setPitchLFORate(1)
        setStepFlag(true)
        setSplitBands(false)
        setSplitBandFreq(500)
        setPaused(false)
        setSeekTo(null)
        setSecondsProgress(0)
        setProgress(0)
        setDragProgress(null)
        setDragging(false)
        setABDragging(false)

        engine.player.playbackRate = 1
        engine.soundtouchNode.parameters.get("pitch").value = 1
        engine.lfoNode.parameters.get("lfoRate").value = 1
        engine.lfoNode.port.postMessage({lfoShape: "square"})
        engine.player.reverse = false
        Tone.getTransport().loop = false

        updateDuration()
        stop()
        play()
        setTimeout(() => {
            applyEffects()
        }, 100)
    }

    const updateLoop = async (value?: boolean) => {
        const enabled = value !== undefined ? value : !(loop || abloop)
        setLoop(enabled)
        if (!enabled) setABLoop(false)
    }

    const applyLoopRegion = (currentDuration: number, useAB = abloop) => {
        if (currentDuration <= 0) return
        const transport = Tone.getTransport()
        const start = useAB ? currentDuration * (reverse ? 100 - loopEnd : loopStart) / 100 : 0
        const end = useAB ? currentDuration * (reverse ? 100 - loopStart : loopEnd) / 100 : currentDuration
        transport.setLoopPoints(start, end)
        transport.loop = loop || useAB
        if ((loop || useAB) && (transport.seconds < start || transport.seconds >= end)) {
            transport.seconds = start
        }
    }

    useEffect(() => {
        applyLoopRegion(duration)
    }, [loop, abloop, loopStart, loopEnd, duration, reverse, midi, midiDuration, speed])

    const seek = (value: number) => {
        if (duration <= 0 || !Number.isFinite(value)) return
        setDragging(false)
        setDragProgress(null)
        const transport = Tone.getTransport()
        const displayPosition = duration * Math.max(0, Math.min(100, value)) / 100
        const target = reverse ? duration - displayPosition : displayPosition
        const wasPlaying = transport.state === "started" && Tone.getContext().state === "running"
        const time = Tone.now()
        transport.pause(time)
        if (!midi) {
            engine.player.unsync()
            engine.player.sync().start(0)
        }
        transport.seconds = target
        if (midi) buildMIDI()
        if (wasPlaying) transport.start(time, target)
        setProgress(displayPosition / duration * 100)
        setSecondsProgress(displayPosition)
        publishNowPlaying(undefined, displayPosition)
    }

    const rewind = (value: number) => {
        const current = reverse ? duration - Tone.getTransport().seconds : Tone.getTransport().seconds
        const seconds = current - value
        const percent = seconds / duration * 100
        seek(percent)
    }

    const fastforward = (value: number) => {
        const current = reverse ? duration - Tone.getTransport().seconds : Tone.getTransport().seconds
        const seconds = current + value
        const percent = seconds / duration * 100
        seek(percent)
    }

    const updateProgressText = (value: number) => {
        let percent = value / 100
        if (reverse) {
            const secondsProgress = (1-percent) * duration
            setDragProgress(duration - secondsProgress)
        } else {
            const secondsProgress = percent * duration
            setDragProgress(secondsProgress)
        }
    }

    const updateSynth = () => {
        if (!engine.lfoNode) return
        if (midi) buildMIDI()
        engine.lfoNode.port.postMessage({lfoShape: wave})
    }

    useEffect(() => {
        if (!synthLoaded) return
        updateSynth()
    }, [synthLoaded, wave, basicWave, waveType, attack, decay, 
        sustain, release, poly, portamento])

    useEffect(() => {
        const transport = Tone.getTransport()
        const onLoopEnd = (time: number) => releaseMidiNotes(time)
        const onLoop = () => publishNowPlaying()
        transport.on("loopEnd", onLoopEnd)
        transport.on("loop", onLoop)
        return () => {
            transport.off("loopEnd", onLoopEnd)
            transport.off("loop", onLoop)
        }
    }, [])

    const buildMIDI = useEffectEvent(async (applyState?: any) => {
        const localState = applyState ? applyState.state : 
            {midiFile, midiDuration, speed, reverse, pitch, preservesPitch}
        const synthArray = applyState ? applyState.synths : engine.synths
        if (!localState.midiFile) return

        const midi = localState.midiFile
        disposeSynths(synthArray)
        const totalDuration = localState.midiDuration / localState.speed

        midi.tracks.forEach((track: any) => {
            let synth: any

            if (poly) {
                synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: {type: wave as any},
                    envelope: {attack, decay, sustain, release},
                    portamento,
                    volume: -12
                }).sync()
            } else {
                synth = new Tone.Synth({
                    oscillator: {type: wave as any},
                    envelope: {attack, decay, sustain, release},
                    portamento,
                    volume: -12
                }).sync()
            }

            if (!applyState) synth.toDestination()
            synthArray.push(synth)

            track.notes.forEach((note: any) => {
                let time = note.time
                let duration = note.duration

                if (localState.reverse) {
                    time = localState.midiDuration - (note.time + note.duration)
                }

                time /= localState.speed
                duration /= localState.speed

                let transposed = note.name
                if (localState.preservesPitch) {
                    transposed = functions.transposeNote(note.name, localState.pitch)
                } else {
                    transposed = functions.transposeNote(
                        note.name, localState.pitch + functions.noteFactor(localState.speed)
                    )
                }

                synth.triggerAttackRelease(
                    transposed,
                    duration,
                    time,
                    note.velocity
                )
            })
        })

        updateDuration(totalDuration)
        applyEffects()
    })

    const upload = useEffectEvent(async (source?: string, recentItem?: SongItem, updateHistory = true, 
        metadata?: {name: string, mimeType: string}) => {
        if (!source && !recentItem?.storedFile) return
        const request = ++loadRequest.current
        playbackRequest.current++
        await audioReady

        const file = recentItem
            ? await functions.readRecent(recentItem) ?? await functions.getFile(source!)
            : await functions.getFile(source!, metadata)

        const isMIDI = recentItem?.midi ?? /\.(mid|midi)$/i.test(file.name)
        const bytes = await file.arrayBuffer()
        const parsedMIDI = isMIDI ? new Midi(bytes) : null
        const decoded = isMIDI ? null : await Tone.getContext().decodeAudioData(bytes)
        if (request !== loadRequest.current) return

        let cover = recentItem?.songCover || (isMIDI ? midiPlaceholder : placeholder)

        if (!isMIDI && !recentItem) {
            const tagInfo = await new Promise<any>((resolve, reject) => {
                new jsmediatags.Reader(file).read({onSuccess: resolve, onError: reject})
            }).catch(() => null)
            const picture = tagInfo?.tags.picture
            if (picture) {
                cover = `data:${picture.format};base64,${Buffer.from(picture.data).toString("base64")}`
            }
        }

        const name = recentItem?.songName || file.name
            .replace(/\.(mp3|wav|flac|ogg|m4a|aac|mid|midi)$/i, "")

        const storedFile = await functions.saveRecent(file, recentItem)
        if (request !== loadRequest.current) return

        const url = URL.createObjectURL(file)
        const totalDuration = parsedMIDI?.duration ?? decoded!.duration
        const trackBPM = parsedMIDI?.header.tempos[0]?.bpm ?? recentItem?.bpm ?? 120
        stop()
        setPaused(true)
        if (decoded) engine.player.buffer.set(decoded)

        flushSync(() => {
            setMidi(isMIDI)
            setMidiFile(parsedMIDI)
            setMidiDuration(parsedMIDI ? totalDuration : 0)
            setDuration(totalDuration / speed)
            setBpm(trackBPM)
            setSongCover(cover)
            setSongName(name)
            setSong(url)
            setCurrentSong(storedFile)
            setSongUrl("")
            setSecondsProgress(0)
            setProgress(0)
            setSeekTo(null)
            setDragging(false)
            setDragProgress(null)
        })

        if (playbackURL.current) URL.revokeObjectURL(playbackURL.current)
        playbackURL.current = url
        currentSong.current = storedFile
        switchState(isMIDI)
        if (!isMIDI) refreshState()
        await play(true)

        // Skipping tracks will skip recent update
        if (!updateHistory) return

        await functions.updateRecent({
            songName: name,
            song: storedFile,
            storedFile,
            filename: file.name,
            mimeType: file.type,
            songCover: cover,
            songUrl: "",
            duration: totalDuration,
            midi: isMIDI,
            bpm: trackBPM
        })

        setRecentFlag(true)
    })

    const applyAB = (duration: number, start?: number, end?: number) => {
        if (!abloop) return
        let startPos = start !== undefined ? start : loopStart
        let endPos = end !== undefined ? end : loopEnd
        let percent = duration / 100.0
        if (reverse) {
            Tone.getTransport().loopStart = (100 - endPos) * percent
            Tone.getTransport().loopEnd = (100 - startPos) * percent
        } else {
            Tone.getTransport().loopStart = startPos * percent
            Tone.getTransport().loopEnd = endPos * percent
        }
    }

    const applyState = useEffectEvent(async (localState: any, player: Tone.Player) => {
        const apply = {state: localState, player}
        const url = Capacitor.convertFileSrc(localState.song)
        const arrayBuffer = await fetch(url).then((r) => r.arrayBuffer())
        const decoded = await Tone.getContext().decodeAudioData(arrayBuffer)
        player.buffer.set(decoded)
        let editCode = ""
        if (localState.speed !== 1) {
            updateSpeed(undefined, apply)
            editCode += "-speed"
        }
        if (localState.reverse !== false) {
            updateReverse(undefined, apply)
            editCode += "-reverse"
        } 
        if (localState.pitch !== 0) {
            updatePitch(undefined, apply)
            editCode += "-pitch"
        }
        if (localState.abloop !== false) {
            editCode += "-loop"
        }
        let effectNodes = [] as any
        if (localState.sampleRate !== 44100) {
            const bit = await bitcrush(localState, true) as any
            effectNodes.push(bit)
            editCode += "-bitcrush"
        }
        if (localState.reverbMix !== 0) {
            const verb = await reverb(localState, true) as Tone.Reverb
            effectNodes.push(verb)
            editCode += "-reverb"
        }
        if (localState.delayMix !== 0) {
            const del = await delay(localState, true) as Tone.PingPongDelay
            effectNodes.push(del)
            editCode += "-delay"
        }
        if (localState.phaserMix !== 0) {
            const phas = await phaser(localState, true) as Tone.Phaser
            effectNodes.push(phas)
            editCode += "-phaser"
        }
        if (localState.lowpassCutoff !== 100) {
            const low = await lowpass(localState, true) as Tone.Filter
            effectNodes.push(low)
            editCode += "-lowpass"
        }
        if (localState.highpassCutoff !== 0) {
            const high = await highpass(localState, true) as Tone.Filter
            effectNodes.push(high)
            editCode += "-highpass"
        }
        if (localState.highshelfGain !== 0) {
            const high = await highshelf(localState, true) as Tone.Filter
            effectNodes.push(high)
            editCode += "-highshelf"
        }
        if (localState.lowshelfGain !== 0) {
            const low = await lowshelf(localState, true) as Tone.Filter
            effectNodes.push(low)
            editCode += "-lowshelf"
        }
        editCode = editCode
        const current = player
        return {current, effectNodes}
    })

    const applyMIDIState = async (localState: any, synths: Tone.PolySynth[]) => {
        const apply = {state: localState, synths}
        await buildMIDI(apply)
        let editCode = ""
        if (localState.speed !== 1) {
            editCode += "-speed"
        }
        if (localState.reverse !== false) {
            editCode += "-reverse"
        } 
        if (localState.pitch !== 0) {
            editCode += "-pitch"
        }
        if (localState.abloop !== false) {
            editCode += "-loop"
        }
        let effectNodes = [] as any
        if (localState.sampleRate !== 100) {
            const bit = await bitcrush(localState, true) as any
            effectNodes.push(bit)
            editCode += "-bitcrush"
        }
        if (localState.reverbMix !== 0) {
            const verb = await reverb(localState, true) as Tone.Reverb
            effectNodes.push(verb)
            editCode += "-reverb"
        }
        if (localState.delayMix !== 0) {
            const del = await delay(localState, true) as Tone.PingPongDelay
            effectNodes.push(del)
            editCode += "-delay"
        }
        if (localState.phaserMix !== 0) {
            const phas = await phaser(localState, true) as Tone.Phaser
            effectNodes.push(phas)
            editCode += "-phaser"
        }
        if (localState.lowpassCutoff !== 100) {
            const low = await lowpass(localState, true) as Tone.Filter
            effectNodes.push(low)
            editCode += "-lowpass"
        }
        if (localState.highpassCutoff !== 0) {
            const high = await highpass(localState, true) as Tone.Filter
            effectNodes.push(high)
            editCode += "-highpass"
        }
        if (localState.highshelfGain !== 0) {
            const high = await highshelf(localState, true) as Tone.Filter
            effectNodes.push(high)
            editCode += "-highshelf"
        }
        if (localState.lowshelfGain !== 0) {
            const low = await lowshelf(localState, true) as Tone.Filter
            effectNodes.push(low)
            editCode += "-lowshelf"
        }
        editCode = editCode
        return {synthArray: synths, effectNodes}
    }

     /** Renders the same as online */
     const render = useEffectEvent(async (start: number, duration: number) => {
        if (!engine.audioNode && !engine.effectNode && !engine.lfoNode) return
        return Tone.Offline(async (offlineContext) => {
            let player = new Tone.Player({context: offlineContext}).sync()
            let synths = [] as Tone.PolySynth[]
            let state = {
                song, speed, reverse, pitch, abloop, sampleRate, reverbMix, 
                delayMix, phaserMix, lowpassCutoff, highpassCutoff, highshelfGain, lowshelfGain,
                midiFile, midiDuration, preservesPitch
            }
            if (midi) {
                const {synthArray, effectNodes} = await applyMIDIState(state, synths)
                synthArray.forEach((s) => s.chain(...[...effectNodes, offlineContext.destination]))
            } else {
                let {current, effectNodes} = await applyState(state, player)
                effectNodes = (effectNodes ?? []).filter(Boolean)
                // @ts-expect-error
                const audioNode = new Tone.ToneAudioNode({context: offlineContext})
                engine.gainNode = new Tone.Gain({gain: 1, context: offlineContext})
                audioNode.input = current
                audioNode.output = engine.gainNode.input
                await offlineContext.addAudioWorkletModule(engine.soundtouchURL, "soundtouch-processor")
                const soundtouchNode = offlineContext.createAudioWorkletNode("soundtouch-processor") as any
                const staticSoundtouchNode = offlineContext.createAudioWorkletNode("soundtouch-processor") as any
                const staticSoundtouchNode2 = offlineContext.createAudioWorkletNode("soundtouch-processor") as any
                const pitchCorrect = preservesPitch ? 1 / speed : 1
                soundtouchNode.parameters.get("pitch").value = functions.semitonesToScale(pitch) * pitchCorrect
                
                if (pitchLFO) {
                    // @ts-expect-error
                    const effectNode = new Tone.ToneAudioNode({context: offlineContext})
                    effectNode.input = current
                    effectNode.output = engine.gainNode.input
                    await offlineContext.addAudioWorkletModule(engine.lfoURL, "lfo-processor")
                    const lfoNode = offlineContext.createAudioWorkletNode("lfo-processor", {numberOfInputs: 2, outputChannelCount: [2]}) as any
                    lfoNode.parameters.get("bpm").value = bpm
                    lfoNode.parameters.get("lfoRate").value = pitchLFORate
                    lfoNode.port.postMessage({lfoShape: wave})

                    if (splitBands) {
                        const lowband = new Tone.Filter({type: "lowpass", frequency: splitBandFreq, Q: filterResonance, rolloff: getFilterSlope(), context: offlineContext})
                        const highband = new Tone.Filter({type: "highpass", frequency: splitBandFreq, Q: filterResonance, rolloff: getFilterSlope(), context: offlineContext})
                        const highbandEffect = new Tone.Filter({type: "highpass", frequency: splitBandFreq, Q: filterResonance, rolloff: getFilterSlope(), context: offlineContext})
                        audioNode.input = player
                        effectNode.input = player
                        audioNode.input.connect(lowband)
                        audioNode.input.connect(highband)
                        effectNode.input.connect(highbandEffect)
    
                        lowband.chain(...[staticSoundtouchNode2, ...effectNodes, audioNode.output, offlineContext.destination])
                        
                        highband.connect(staticSoundtouchNode)
                        highbandEffect.connect(soundtouchNode)
                        staticSoundtouchNode.connect(lfoNode, 0, 0)
                        soundtouchNode.connect(lfoNode, 0, 1)
                        let currentNode = lfoNode
                        for (let i = 0; i < effectNodes.length; i++) {
                            const node = effectNodes[i] instanceof Tone.ToneAudioNode ? effectNodes[i].input : effectNodes[i]
                            try {
                                currentNode.connect(node)
                                currentNode = effectNodes[i]
                            } catch {}
                        }
                        currentNode.connect(audioNode.output)
                        audioNode.connect(offlineContext.destination)
                        audioNode.input.start()
                    } else {
                        audioNode.input.connect(staticSoundtouchNode)
                        effectNode.input.connect(soundtouchNode)
                        staticSoundtouchNode.connect(lfoNode, 0, 0)
                        soundtouchNode.connect(lfoNode, 0, 1)
                        let currentNode = lfoNode
                        for (let i = 0; i < effectNodes.length; i++) {
                            const node = effectNodes[i] instanceof Tone.ToneAudioNode ? effectNodes[i].input : effectNodes[i]
                            try {
                                currentNode.connect(node)
                                currentNode = effectNodes[i]
                            } catch {}
                        }
                        currentNode.connect(audioNode.output)
                        audioNode.connect(offlineContext.destination)
                        audioNode.input.start()
                    }
                } else {
                    if (splitBands) {
                        const lowband = new Tone.Filter({type: "lowpass", frequency: splitBandFreq, Q: filterResonance, rolloff: getFilterSlope(), context: offlineContext})
                        const highband = new Tone.Filter({type: "highpass", frequency: splitBandFreq, Q: filterResonance, rolloff: getFilterSlope(), context: offlineContext})
                        audioNode.input = player
                        audioNode.input.connect(lowband)
                        audioNode.input.connect(highband)
                        lowband.chain(...[staticSoundtouchNode, ...effectNodes, audioNode.output, offlineContext.destination])
                        highband.chain(...[soundtouchNode, ...effectNodes, audioNode.output, offlineContext.destination])
                        audioNode.input.start()
                    } else {
                        audioNode.input.chain(...[soundtouchNode, ...effectNodes, audioNode.output, offlineContext.destination]).start()
                    }
                }
            }
            offlineContext.transport.start(start)
        }, duration, 2, 44100)
    })

    const downloadSong = useEffectEvent(async () => {
        if (!song) return
        const filename = `${functions.decodeEntities(songName)}${editCode}`
        if (midi && midiFile) {
            const sourceMidi = new Midi()
            sourceMidi.fromJSON(midiFile)
            const midiTrack = new Midi()
            midiTrack.header = sourceMidi.header
            sourceMidi.tracks.forEach((track: any) => {
                const newTrack = midiTrack.addTrack()
                if (reverse) {
                    const reverseNotes = track.notes.slice().reverse()
                    const initialTime = reverseNotes[0].time
                    reverseNotes.forEach((reverseNote: any) => {
                        let transposed = reverseNote.name
                        if (preservesPitch) {
                            transposed = functions.transposeNote(reverseNote.name, pitch)
                        } else {
                            transposed = functions.transposeNote(reverseNote.name, pitch + functions.noteFactor(speed))
                        }
                        reverseNote.name = transposed
                        reverseNote.duration = reverseNote.duration / speed
                        reverseNote.time = Math.abs(reverseNote.time - initialTime) / speed
                        newTrack.addNote(reverseNote)
                    })
                } else {
                    const notes = track.notes.slice()
                    notes.forEach((note: any) => {
                        let transposed = note.name
                        if (preservesPitch) {
                            transposed = functions.transposeNote(note.name, pitch)
                        } else {
                            transposed = functions.transposeNote(note.name, pitch + functions.noteFactor(speed))
                        }
                        note.name = transposed
                        note.duration = note.duration / speed
                        note.time = note.time / speed
                        newTrack.addNote(note)
                    })
                }
            })

            const buffer = Buffer.from(midiTrack.toArray())

            await Filesystem.writeFile({path: `${filename}.mid`,
                data: buffer.toString("base64"),
                directory: Directory.Cache,
                recursive: true
            })
            const {uri} = await Filesystem.getUri({path: `${filename}.mid`, directory: Directory.Cache})
            await Share.share({title: filename, files: [uri], dialogTitle: "Share MIDI"})
        } else {
            let currentDuration = duration
            let start = 0
            if (abloop) {
                start = loopStart
                currentDuration = ((loopEnd / 1000) * duration) - ((loopStart / 1000) * duration)
            }
            const audioBuffer = await render(start, currentDuration)
            if (!audioBuffer) return

            const blob = await functions.encodeMP3(audioBuffer.get()!)
            let mp3 = await blob.arrayBuffer() as any
            if (songCover) mp3 = await functions.appendMP3Cover(mp3, songCover, songName, currentDuration)
            const buffer = Buffer.from(mp3, "binary")

            await Filesystem.writeFile({path: `${filename}.mp3`,
                data: buffer.toString("base64"),
                directory: Directory.Cache,
                recursive: true
            })
            const {uri} = await Filesystem.getUri({path: `${filename}.mp3`, directory: Directory.Cache})
            await Share.share({title: filename, files: [uri], dialogTitle: "Share Audio"})
        }
    })

    const previous = async () => {
        if (!currentSong.current || skipping.current) return
        skipping.current = true
        const request = loadRequest.current

        const recent = await functions.getRecent()
        if (request !== loadRequest.current) return

        const index = recent.findIndex((item) =>
            (item.storedFile || item.song) === currentSong.current)
        
        const target = index < 0 ? undefined : recent[index - 1]
        if (target) await upload(target.songUrl || target.song, target, false)
        skipping.current = false
    }

    const next = async () => {
        if (!currentSong.current || skipping.current) return
        skipping.current = true
        const request = loadRequest.current

        const recent = await functions.getRecent()
        if (request !== loadRequest.current) return

        const index = recent.findIndex((item) =>
            (item.storedFile || item.song) === currentSong.current)
        
        const target = index < 0 ? undefined : recent[index + 1]
        if (target) await upload(target.songUrl || target.song, target, false)
        skipping.current = false
    }

    const bitcrush = async (effect?: any, noApply?: boolean) => {
        if (sampleRate === 100) {
            removeEffect("bitcrush")
        } else {
            let node = effect ? null : engine.bitcrusherNode
            if (!node) {
                const context = Tone.getContext()
                await context.addAudioWorkletModule("/bitcrusher.js", "bitcrush-processor")
                node = context.createAudioWorkletNode("bitcrush-processor")
            }
            node.parameters.get("sampleRate").value = functions.logSlider2(sampleRate, 100, 44100, 1)
            if (noApply) return node
            engine.bitcrusherNode = node
            pushEffect("bitcrush", node)
            applyEffects()
        }
    }

    useEffect(() => {
        bitcrush()
    }, [sampleRate])

    const reverb = async (effect?: any, noApply?: boolean) => {
        if (reverbMix === 0) {
            removeEffect("reverb")
        } else {
            let node = effect ? null : engine.reverbNode
            if (!node) node = new Tone.Reverb({wet: reverbMix, decay: reverbDecay})
            node.wet.value = reverbMix
            node.decay = reverbDecay
            if (noApply) return node
            engine.reverbNode = node
            pushEffect("reverb", node)
            applyEffects()
        }
    }

    useEffect(() => {
        reverb()
    }, [reverbMix, reverbDecay])

    const delay = async (effect?: any, noApply?: boolean) => {
        if (delayMix === 0) {
            removeEffect("delay")
        } else {
            let node = effect ? null : engine.delayNode
            if (!node) node = new Tone.PingPongDelay({wet: delayMix, delayTime: delayTime, feedback: delayFeedback})
            node.wet.value = delayMix
            node.delayTime.value = delayTime
            node.feedback.value = delayFeedback
            if (noApply) return node
            engine.delayNode = node
            pushEffect("delay", node)
            applyEffects()
        }
    }

    useEffect(() => {
        delay()
    }, [delayMix, delayTime, delayFeedback])

    const phaser = async (effect?: any, noApply?: boolean) => {
        if (phaserMix === 0) {
            removeEffect("phaser")
        } else {
            let node = effect ? null : engine.phaserNode
            if (!node) node = new Tone.Phaser({wet: phaserMix, frequency: phaserFrequency})
            node.wet.value = phaserMix
            node.frequency.value = phaserFrequency
            if (noApply) return node
            engine.phaserNode = node
            pushEffect("phaser", node)
            applyEffects()
        }
    }
    
    useEffect(() => {
        phaser()
    }, [phaserMix, phaserFrequency])

    const getFilterSlope = () => {
        if (filterSlope === 0) return -12
        if (filterSlope === 1) return -24
        if (filterSlope === 2) return -48
        if (filterSlope === 3) return -96
        return -12
    }

    const lowpass = async (effect?: any, noApply?: boolean) => {
        if (lowpassCutoff === 100) {
            removeEffect("lowpass")
        } else {
            let node = effect ? null : engine.lowpassNode
            if (!node) node = new Tone.Filter({type: "lowpass", 
                frequency: functions.logSlider2(lowpassCutoff, 20, 20000), 
                Q: filterResonance, rolloff: getFilterSlope()})
            node.type = "lowpass"
            node.frequency.value = functions.logSlider2(lowpassCutoff, 20, 20000)
            node.Q.value = filterResonance
            node.rolloff = getFilterSlope()
            if (noApply) return node
            engine.lowpassNode = node
            pushEffect("lowpass", node)
            applyEffects()
        }
    }
    
    useEffect(() => {
        lowpass()
    }, [lowpassCutoff, filterResonance, filterSlope])

    const highpass = async (effect?: any, noApply?: boolean) => {
        if (highpassCutoff === 0) {
            removeEffect("highpass")
        } else {
            let node = effect ? null : engine.highpassNode
            if (!node) node = new Tone.Filter({type: "highpass", 
                frequency: functions.logSlider2(highpassCutoff, 20, 20000), 
                Q: filterResonance, rolloff: getFilterSlope()})
            node.type = "highpass"
            node.frequency.value = functions.logSlider2(highpassCutoff, 20, 20000)
            node.Q.value = filterResonance
            node.rolloff = getFilterSlope()
            if (noApply) return node
            engine.highpassNode = node
            pushEffect("highpass", node)
            applyEffects()
        }
    }

    useEffect(() => {
        highpass()
    }, [highpassCutoff, filterResonance, filterSlope])

    const highshelf = async (effect?: any, noApply?: boolean) => {
        if (highshelfGain === 0) {
            removeEffect("highshelf")
        } else {
            let node = effect ? null : engine.highshelfNode
            if (!node) node = new Tone.Filter({type: "highshelf", 
                frequency: functions.logSlider2(highshelfCutoff, 20, 20000), 
                gain: highshelfGain, Q: filterResonance, rolloff: getFilterSlope()})
            node.type = "highshelf"
            node.frequency.value = functions.logSlider2(highshelfCutoff, 20, 20000)
            node.gain.value = highshelfGain
            node.Q.value = filterResonance
            node.rolloff = getFilterSlope()
            if (noApply) return node
            engine.highshelfNode = node
            pushEffect("highshelf", node)
            applyEffects()
        }
    }

    useEffect(() => {
        highshelf()
    }, [highshelfCutoff, highshelfGain, filterResonance, filterSlope])

    const lowshelf = async (effect?: any, noApply?: boolean) => {
        if (lowshelfGain === 0) {
            removeEffect("lowshelf")
        } else {
            let node = effect ? null : engine.lowshelfNode
            if (!node) node = new Tone.Filter({type: "lowshelf", 
                frequency: functions.logSlider2(lowshelfCutoff, 20, 20000), 
                gain: lowshelfGain, Q: filterResonance, rolloff: getFilterSlope()})
            node.type = "lowshelf"
            node.frequency.value = functions.logSlider2(lowshelfCutoff, 20, 20000)
            node.gain.value = lowshelfGain
            node.Q.value = filterResonance
            node.rolloff = getFilterSlope()
            if (noApply) return node
            engine.lowshelfNode = node
            pushEffect("lowshelf", node)
            applyEffects()
        }
    }
    
    useEffect(() => {
        lowshelf()
    }, [lowshelfCutoff, lowshelfGain, filterResonance, filterSlope])

    const getLFORate = () => {
        if (pitchLFORate === 5) return "1/1"
        if (pitchLFORate === 4) return "1/2"
        if (pitchLFORate === 3) return "1/4"
        if (pitchLFORate === 2) return "1/8"
        if (pitchLFORate === 1) return "1/16"
        if (pitchLFORate === 0) return "1/32"
        return "1/16"
    }

    const togglePopup = (popup: "speed" | "pitch") => {
        if (popup === "speed") {
            setShowPitchPopup(false)
            setShowSpeedPopup((prev) => !prev)
        } else if (popup === "pitch") {
            setShowSpeedPopup(false)
            setShowPitchPopup((prev) => !prev)
        }
    }

    return (
        <main className="audio-player">
            <section className="player">
                <div className="player-container">
                    {/* <img className="player-img" src={songCover}/> */}
                    <div className="player-row">
                        <div className="player-text-container">
                            <h2 className="player-text">{songName}</h2>
                        </div>
                    </div>
                    <div className="player-row">
                        <div className="play-button-container">
                            <button className="player-button skip-button" onClick={() => previous()}>
                                <PrevIcon/>
                            </button>
                            {paused ? <PlayIcon className="player-button play-button" onClick={() => play()}/> : 
                            <PauseIcon className="player-button play-button" onClick={() => play()}/>}
                            <button className="player-button skip-button" onClick={() => next()}>
                                <NextIcon/>
                            </button>
                        </div>
                    </div>
                    <div className="player-row">
                        <div className="progress-container">
                            <Slider className="progress-slider" trackClassName="progress-slider-track" thumbClassName="progress-slider-handle"
                            ref={progressBar} min={0} max={100} step={0.01} onBeforeChange={() => setDragging(true)} onChange={(value: number) => updateProgressText(value)} 
                            onAfterChange={(value: number) => seek(value)} value={dragging && !abDragging ? ((dragProgress || 0) / duration) * 100 : progress}/>

                            <div className="progress-text-container">
                                <span className="player-text">{dragging ? functions.formatSeconds(dragProgress || 0) : functions.formatSeconds(secondsProgress)}</span> 
                                <span className="player-text">{functions.formatSeconds(duration)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="player-row">
                        <div className="special-button-container">
                            <ScalableHaptic onPress={() => setReverse(!reverse)}>
                                <ReverseIcon className={`player-button ${reverse && "active-button"}`}/>
                            </ScalableHaptic>
                            <ScalableHaptic onPress={() => setShowSpeedSheet(true)}>
                                <SpeedIcon className={`player-button ${speed !== 1 && "active-button"}`}/>
                            </ScalableHaptic>
                            <ScalableHaptic onPress={() => setShowPitchSheet(true)}>
                                <PitchIcon ref={pitchIcon} className={`player-button ${pitch !== 0 && "active-button"}`}/>  
                            </ScalableHaptic>
                            <ScalableHaptic onPress={() => updateLoop()}>
                                <LoopIcon className={`player-button ${(loop || abloop) && "active-button"}`}/>
                            </ScalableHaptic>
                            <ScalableHaptic onPress={() => setShowABLoopSheet(true)}>
                                <ABLoopIcon className={`player-button ${abloop && "active-button"}`}/>  
                            </ScalableHaptic>
                            <ScalableHaptic onPress={() => reset()}>
                                <RevertIcon className="player-button"/>
                            </ScalableHaptic>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}

export default AudioPlayer