/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import React, {useEffect, useReducer, useState} from "react"
import * as Tone from "tone"
import square from "../assets/images/square.png"
import MP3UpIcon from "../assets/svg/mp3-up.svg"
import MP3DownIcon from "../assets/svg/mp3-down.svg"
import LeftArrowIcon from "../assets/svg/left-arrow.svg"
import RightArrowIcon from "../assets/svg/right-arrow.svg"
import {FilePicker} from "@capawesome/capacitor-file-picker"
import {SongItem} from "../structures/functions"
import {useFlagSelector, useFlagActions, usePlaybackSelector} from "../store"
import PressableHaptic from "../ui/PressableHaptic"
import ScalableHaptic from "../ui/ScalableHaptic"
import functions from "../structures/functions"
import audio from "../structures/audio"
import "./styles/recentplays.less"

let recent = [] as SongItem[]
let pages = [] as SongItem[][]

const RecentPlays: React.FunctionComponent = (props) => {
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0)
    const [pageIndex, setPageIndex] = useState(0)
    const [deleteQueue, setDeleteQueue] = useState({})
    const {currentSong} = usePlaybackSelector()
    const {recentFlag} = useFlagSelector()
    const {setUploadFlag, setPlayFlag, setDownloadFlag, setRecentFlag} = useFlagActions()

    const isTablet = () => {
        return Math.min(window.screen.width, window.screen.height) >= 600
    }

    const pageSize = isTablet() ? 8 : 4
    const columns = isTablet() ? 4 : 2

    useEffect(() => {
        let cancelled = false
        const updateRecentGUI = async () => {
            const savedRecent = await functions.getRecent()
            if (cancelled) return
            recent = savedRecent
            let newPages = [] as any
            let counter = 0;
            while (counter < recent.length) {
                let newPage = [] as any
                for (let i = 0; i < pageSize; i++) {
                    if (!recent[counter]) break
                    newPage.push(recent[counter])
                    counter++
                }
                if (newPage.length) newPages.push(newPage)
            }
            pages = newPages
            setPageIndex((index) => Math.min(index, Math.max(0, pages.length - 1)))
            forceUpdate()
            setRecentFlag(false)
        }
        updateRecentGUI()
        return () => { 
            cancelled = true 
        }
    }, [recentFlag])

    const upload = async () => {
        audio.resumeContext(Tone.getContext())
        let supportedTypes = ["audio/wav", 
            "audio/mpeg", "audio/ogg", "audio/flac", 
            "audio/acc", "audio/mp4", "audio/midi"]
        const result = await FilePicker.pickFiles({limit: 1, types: supportedTypes})
        const file = result.files[0]
        if (file) {
            const path = file.path ?? file.webPath
            if (path) setUploadFlag({path, name: file.name, mimeType: file.mimeType})
        }
    }

    const download = () => {
        setDownloadFlag(true)
    }

    const invokePlay = (info: SongItem) => {
        void audio.resumeContext(Tone.getContext()).catch(console.warn)
        setPlayFlag(info)
    }

    const generateJSX = () => {
        let row1 = [] as any
        let row2 = [] as any
        for (let i = 0; i < columns; i++) {
            const item = pages[pageIndex]?.[i]
            if (!item) {
                row1.push(<img key={i} className="recent-square" src={square}/>)
            } else {
                row1.push(
                    <div key={item.song} className="recent-song-item" aria-current={(item.storedFile || item.song) === currentSong} data-song={item.song}>
                        <img className="recent-img" onClick={() => invokePlay(item)} src={item.songCover} 
                        onContextMenu={() => setDeleteQueue(item)}/>
                        <div className="recent-song-text-container">
                            <span className="recent-song-text">{item.songName}</span>
                        </div>
                    </div>)
            }
        }
        for (let i = columns; i < pageSize; i++) {
            const item = pages[pageIndex]?.[i]
            if (!item) {
                row2.push(<img key={i} className="recent-square" src={square}/>)
            } else {
                row2.push(
                <div key={item.song} className="recent-song-item" aria-current={(item.storedFile || item.song) === currentSong} data-song={item.song}>
                    <img className="recent-img" onClick={() => invokePlay(item)} src={item.songCover} 
                    onContextMenu={() => setDeleteQueue(item)}/>
                    <div className="recent-song-text-container">
                        <span className="recent-song-text">{item.songName}</span>
                    </div>
                </div>)
            }
        }
        return (
            <div className="recent-row-container">
                <div className="recent-row">{row1}</div>
                <div className="recent-row">{row2}</div>
            </div>
        )
    }

    const previousPage = () => {
        if (pages[pageIndex - 1]) {
            setPageIndex((prev) => prev - 1)
        }
    }

    const nextPage = () => {
        if (pages[pageIndex + 1]) {
            setPageIndex((prev) => prev + 1)
        }
    }

    return (
        <section className="recent-plays">
            <div className="recent-title-container">
                <div className="recent-mp3-buttons">
                    <ScalableHaptic onPress={upload}>
                        <MP3UpIcon className="recent-mp3-button"/>
                    </ScalableHaptic>
                    <ScalableHaptic onPress={download}>
                        <MP3DownIcon className="recent-mp3-button"/>
                    </ScalableHaptic>
                </div>
                <p className="recent-title">Recent Plays</p>
                <div className="recent-page-buttons">
                    <PressableHaptic onPress={previousPage}>
                        <LeftArrowIcon className="recent-page-button"/>
                    </PressableHaptic>
                    <PressableHaptic onPress={nextPage}>
                        <RightArrowIcon className="recent-page-button"/>
                    </PressableHaptic>
                </div>
            </div>
            <div className="recent-scroll">
                {generateJSX()}
            </div>
        </section>
    )
}

export default RecentPlays