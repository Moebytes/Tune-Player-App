/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import * as Tone from "tone"

class AudioEngine {
    public player!: Tone.Player
    public synths = [] as Tone.PolySynth[]
    public audioNode: any
    public effectNode: any
    public gainNode: any
    public soundtouchNode: any
    public staticSoundtouchNode: any
    public staticSoundtouchNode2: any
    public soundtouchURL = ""
    public lfoNode: any
    public lfoURL = ""
    public bitcrusherNode: any
    public reverbNode!: Tone.Reverb
    public delayNode!: Tone.PingPongDelay
    public phaserNode!: Tone.Phaser
    public lowpassNode!: Tone.Filter
    public highpassNode!: Tone.Filter
    public lowshelfNode!: Tone.Filter
    public highshelfNode!: Tone.Filter
}

const engine = new AudioEngine()

const initialize = async () => {
    engine.player = new Tone.Player()
    
    const context = Tone.getContext()
    engine.soundtouchURL = "/soundtouch.js"
    await context.addAudioWorkletModule(engine.soundtouchURL, "soundtouch-processor")
    engine.soundtouchNode = context.createAudioWorkletNode("soundtouch-processor")
    engine.staticSoundtouchNode = context.createAudioWorkletNode("soundtouch-processor")
    engine.staticSoundtouchNode2 = context.createAudioWorkletNode("soundtouch-processor")
    engine.lfoURL = "/lfo.js"
    await context.addAudioWorkletModule(engine.lfoURL, "lfo-processor")
    engine.lfoNode = context.createAudioWorkletNode("lfo-processor", {numberOfInputs: 2, outputChannelCount: [2]})
    engine.gainNode = new Tone.Gain(1)

    // @ts-expect-error
    engine.audioNode = new Tone.ToneAudioNode()
    engine.audioNode.input = engine.player
    engine.audioNode.output = engine.gainNode.input
    engine.audioNode.input.chain(engine.soundtouchNode, engine.audioNode.output)
    // @ts-expect-error
    engine.effectNode = new Tone.ToneAudioNode()
    engine.effectNode.input = engine.player
    engine.effectNode.output = engine.gainNode.input
    engine.effectNode.input.chain(engine.effectNode.output)
    engine.audioNode.toDestination()
}

export const audioReady = typeof window !== "undefined" ? initialize() : Promise.resolve()
audioReady.catch((error) => console.error("Unable to initialize audio", error))

export default engine