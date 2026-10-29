/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import {guess} from "web-audio-beat-detector"
import {ID3Writer} from "browser-id3-writer"
import {Mp3Encoder} from "@breezystack/lamejs"
import {Filesystem, Directory} from "@capacitor/filesystem"
import {Preferences} from "@capacitor/preferences"
import {Buffer} from "buffer"

export interface SongItem {
    storedFile?: string
    filename?: string
    mimeType?: string
    bpm: number
    duration: number
    midi: boolean
    song: string
    songCover: string
    songName: string,
    songUrl: string
}

export default class Functions {
    public static arrayIncludes = (str: string, arr: string[]) => {
        for (let i = 0; i < arr.length; i++) {
            if (str.includes(arr[i])) return true
        }
        return false
    }

    public static arrayRemove = <T>(arr: T[], val: T) => {
        return arr.filter((item) => item !== val)
    }

    public static findDupe = (recent: SongItem[], info: SongItem) => {
        const targetName = info.songName?.trim().toLowerCase()
        const targetDuration = Number(info.duration)

        for (let i = recent.length - 1; i >= 0; i--) {
            const name = recent[i].songName?.trim().toLowerCase()
            const duration = Number(recent[i].duration)

            if (name === targetName &&
                Math.abs(duration - targetDuration) < 0.5) return i
        }
        
        return -1
    }

    public static timeout = async (ms: number) => {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    public static logSlider = (position: number) => {
        const minPos = 0
        const maxPos = 1
        const minValue = Math.log(60)
        const maxValue = Math.log(100)
        const scale = (maxValue - minValue) / (maxPos - minPos)
        const value = Math.exp(minValue + scale * (position - minPos))
        let adjusted = value - 100
        if (adjusted > 0) adjusted = 0
        return adjusted
    }

    public static logSlider2 = (position: number, min: number, max: number, intensity = 0.9) => {
        const minPos = 0
        const maxPos = 100
        const minValue = Math.log(min)
        const maxValue = Math.log(max)
        const scale = (maxValue - minValue) / (maxPos - minPos)
        const adjustedScale = Math.pow(scale, intensity)
        return Math.exp(minValue + adjustedScale * (position - minPos))
    }

    public static formatSeconds = (duration: number) => {
        let seconds = Math.floor(duration % 60) as any
        let minutes = Math.floor((duration / 60) % 60) as any
        let hours = Math.floor((duration / (60 * 60)) % 24) as any
        if (Number.isNaN(seconds) || seconds < 0) seconds = 0
        if (Number.isNaN(minutes) || minutes < 0) minutes = 0
        if (Number.isNaN(hours) || hours < 0) hours = 0

        hours = (hours === 0) ? "" : ((hours < 10) ? "0" + hours + ":" : hours + ":")
        minutes = hours && (minutes < 10) ? "0" + minutes : minutes
        seconds = (seconds < 10) ? "0" + seconds : seconds
        return `${hours}${minutes}:${seconds}`
    }

    public static decodeEntities(encodedString: string) {
        const regex = /&(nbsp|amp|quot|lt|gt);/g
        const translate = {
            nbsp:" ",
            amp : "&",
            quot: "\"",
            lt  : "<",
            gt  : ">"
        } as any
        return encodedString.replace(regex, function(match, entity) {
            return translate[entity]
        }).replace(/&#(\d+);/gi, function(match, numStr) {
            const num = parseInt(numStr, 10)
            return String.fromCharCode(num)
        })
    }

    public static round = (value: number, step?: number) => {
        if (!step) step = 1.0
        const inverse = 1.0 / step
        return Math.round(value * inverse) / inverse
    }

    public static streamToBuffer = async (stream: NodeJS.ReadableStream) => {
        const chunks: any[] = []
        const arr = await new Promise<Buffer>((resolve, reject) => {
            stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
            stream.on("error", (err) => reject(err))
            stream.on("end", () => resolve(Buffer.concat(chunks)))
        })
        return arr.buffer
    }

    public static getFile = async (filepath: string, metadata?: {name: string, mimeType: string}) => {
        let bytes: Uint8Array<ArrayBuffer>
        let mimeType = metadata?.mimeType || "application/octet-stream"

        const mimeTypes: Record<string, string> = {
            mp3: "audio/mpeg",
            wav: "audio/wav",
            flac: "audio/flac",
            ogg: "audio/ogg",
            midi: "audio/midi",
            mid: "audio/midi",
            m4a: "audio/mp4",
            aac: "audio/aac"
        }

        if (/^(blob:|https?:|data:)/i.test(filepath)) {
            const blob = await fetch(filepath).then((r) => r.blob())
            bytes = new Uint8Array(await blob.arrayBuffer())
            mimeType = blob.type || mimeType
        } else {
            const result = await Filesystem.readFile({path: filepath})
            const binary = atob(result.data as string)
            bytes = new Uint8Array(binary.length)

            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i)
            }
        }

        const path = filepath.split("?")[0].split("#")[0]
        const name = metadata?.name || decodeURIComponent(this.basename(path))

        const extension = this.extname(name).replace(".", "").toLowerCase()

        if (mimeType === "application/octet-stream") {
            mimeType = mimeTypes[extension] || mimeType
        }

        return new File([bytes], name, {
            type: mimeType,
            lastModified: Date.now()
        })
    }

    public static transposeNote = (note: string, transpose: number) => {
        const octave = Number(note.match(/\d+/)?.[0])
        note = note.replace(/\d+/g, "")
        const octaveAdjustment = Math.round(transpose / 12)
        const noteAdjustment = transpose - (octaveAdjustment * 12)
        const notes = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"]
        const noteIndex = notes.findIndex((n) => n === note)
        let adjusted = noteIndex + noteAdjustment
        while (adjusted > 12) adjusted -= 12
        while (adjusted < 0) adjusted += 12
        return `${notes[adjusted]}${octave + octaveAdjustment}`
    }

    public static noteFactor = (scaleFactor: number) => {
        if (scaleFactor === 1) return 0
        if (scaleFactor < 1) {
            return Math.round(-1 * ((1 / scaleFactor) * 6))
        } else {
            return Math.round(scaleFactor * 6)
        }
    }

    public static escapeQuotes = (str: string) => {
        return str.replace(/"/g, `"\\""`).replace(/'/g, `'\\''`)
    }

    public static semitonesToScale = (semitones: number) => {
        var scaleFactor = Math.pow(2, semitones / 12)
        scaleFactor = Math.max(0.25, scaleFactor)
        scaleFactor = Math.min(4, scaleFactor)
        return scaleFactor
    }

    public static getBPM = async (audioBuffer: AudioBuffer) => {
        return guess(audioBuffer)
    }

    public static fractionEval = (fraction: string) => {
        const [numerator, denominator] = fraction.split("/").map(Number)
        return numerator / denominator
    }

    public static cropToCenterSquare = (image: string) => {
        const img = new Image()
        img.src = image
        return new Promise<string>((resolve) => {
            img.onload = () => {
                const minDimension = Math.min(img.width, img.height)
                const offsetX = (img.width - minDimension) / 2
                const offsetY = (img.height - minDimension) / 2

                const canvas = document.createElement("canvas")
                canvas.width = minDimension
                canvas.height = minDimension
                const ctx = canvas.getContext("2d")

                if (ctx) {
                    ctx.drawImage(img, offsetX, offsetY, minDimension, minDimension, 0, 0, minDimension, minDimension)
                    const base64 = canvas.toDataURL("image/png")
                    resolve(base64)
                }
            }
        })
    }

    public static bufferToArraybuffer = (buffer: Buffer) => {
        return buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength
        )
    }

    public static appendMP3Cover = async (mp3: ArrayBuffer, image: string, name: string, duration: number) => {
        const imageBuffer = await fetch(image).then((r) => r.arrayBuffer())
        const writer = new ID3Writer(mp3)
        writer.setFrame("TIT2", name)
        .setFrame("TLEN", duration)
        .setFrame("APIC" as any, {type: 3, data: imageBuffer, description: "Song Cover", useUnicodeEncoding: false} as any)
        writer.addTag()
        return fetch(writer.getURL()).then((r) => r.arrayBuffer())
    }

    public static songAtCursor = (coords: {x: number, y: number}) => {
        const images = document.querySelectorAll(".recent-song-item") as NodeListOf<HTMLDivElement>
        let found = null as any
        images.forEach((i) => {
            const rect = i.getBoundingClientRect()
            if (coords.x > rect.left && 
                coords.x < rect.right && 
                coords.y > rect.top && 
                coords.y < rect.bottom) {
                found = i
            }
        })
        return found ? found.dataset.song : null
    }

    public static readableFileSize = (bytes: number) => {
        const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024))
        return `${Number((bytes / Math.pow(1024, i)).toFixed(2))} ${["B", "KB", "MB", "GB", "TB"][i]}`
    }

    public static formatBitrate = (bitrate: number) => {
        if (bitrate < 1000) return bitrate + " bps"
        if (bitrate < 1000000) return (bitrate / 1_000).toFixed(2) + " kbps"
        if (bitrate < 1000000000) return (bitrate / 1_000_000).toFixed(2) + " Mbps"
        return (bitrate / 1000000000).toFixed(2) + " Gbps"
    }

    public static basename = (file: string, suffix?: string) => {
        const normalized = file.replace(/[/\\]+$/, "")

        let base = normalized.split(/[/\\]/).pop() || ""

        if (suffix && base.endsWith(suffix)) {
            base = base.slice(0, -suffix.length)
        }

        return base
    }

    public static extname = (file: string) => {
        const base = this.basename(file)

        if (!base || base === "." || base === "..") return ""

        const lastDot = base.lastIndexOf(".")
        if (lastDot <= 0) return ""

        return base.slice(lastDot)
    }

    public static getRecent = async () => {
        const {value} = await Preferences.get({key: "recent"})
        return value ? JSON.parse(value) as SongItem[] : []
    }

    public static updateRecent = async (item: SongItem) => {
        const {value} = await Preferences.get({key: "recent"})

        const recent: SongItem[] = value ? JSON.parse(value) : []

        const dupe = this.findDupe(recent, item)
        if (dupe !== -1) recent.splice(dupe, 1)

        recent.unshift(item)
        if (recent.length > 200) recent.length = 200

        await Preferences.set({key: "recent", value: JSON.stringify(recent)})

        return recent
    }

    public static encodeMP3 = async (audio: AudioBuffer) => {
        const channels = audio.numberOfChannels
        const encoder = new Mp3Encoder(channels, audio.sampleRate, 320)

        const samples = Array.from({length: channels}, (_, channel) => {
            return Int16Array.from(audio.getChannelData(channel), (sample) =>
                Math.round(Math.max(-1, Math.min(1, sample)) * 32767))
        })
        
        const chunks: BlobPart[] = []
        let lastYield = performance.now()
        const frames = 1152

        for (let offset = 0; offset < audio.length; offset += frames) {
            const left = samples[0].subarray(offset, offset + frames)
            const right = samples[1]?.subarray(offset, offset + frames)
            const chunk = encoder.encodeBuffer(left, right)
            if (chunk.length) chunks.push(new Uint8Array(chunk))

            if (performance.now() - lastYield > 16) {
                await new Promise((resolve) => setTimeout(resolve, 0))
                lastYield = performance.now()
            }
        }

        const finalChunk = encoder.flush()
        if (finalChunk.length) chunks.push(new Uint8Array(finalChunk))
        return new Blob(chunks, {type: "audio/mpeg"})
    }

    public static saveRecent = async (file: File, existing?: SongItem) => {
        if (existing?.storedFile) return existing.storedFile
        
        const extension = this.extname(file.name)
        const path = `songs/${crypto.randomUUID()}${extension}`

        await Filesystem.writeFile({path,
            directory: Directory.Data,
            data: Buffer.from(await file.arrayBuffer()).toString("base64"),
            recursive: true
        })

        return path
    }

    public static readRecent = async (item: SongItem): Promise<File | null> => {
        if (!item.storedFile) return null

        const {data} = await Filesystem.readFile({path: item.storedFile, directory: Directory.Data})

        const bytes = typeof data === "string"
            ? new Uint8Array(Buffer.from(data, "base64"))
            : new Uint8Array(await data.arrayBuffer())

        return new File([bytes], item.filename || item.songName, {type: item.mimeType || ""})
    }
}