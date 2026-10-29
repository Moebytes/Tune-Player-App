/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import {createSlice} from "@reduxjs/toolkit"
import {useSelector, useDispatch} from "react-redux"
import type {StoreState, StoreDispatch} from "../store"
import type {SongItem} from "../structures/functions"

export type UploadFile = {path: string, name: string, mimeType: string}

const flagSlice = createSlice({
    name: "flag",
    initialState: {
        uploadFlag: null as UploadFile | null,
        playFlag: null as SongItem | null,
        downloadFlag: false,
        recentFlag: true
    },
    reducers: {
        setUploadFlag: (state, action) => {state.uploadFlag = action.payload},
        setPlayFlag: (state, action) => {state.playFlag = action.payload},
        setDownloadFlag: (state, action) => {state.downloadFlag = action.payload},
        setRecentFlag: (state, action) => {state.recentFlag = action.payload}
    }
})

const {
    setUploadFlag, setPlayFlag, setDownloadFlag, setRecentFlag
} = flagSlice.actions

export const useFlagSelector = () => {
    const selector = useSelector.withTypes<StoreState>()
    return {
        uploadFlag: selector((state) => state.flag.uploadFlag),
        playFlag: selector((state) => state.flag.playFlag),
        downloadFlag: selector((state) => state.flag.downloadFlag),
        recentFlag: selector((state) => state.flag.recentFlag)
    }
}

export const useFlagActions = () => {
    const dispatch = useDispatch.withTypes<StoreDispatch>()()
    return {
        setUploadFlag: (state: UploadFile | null) => dispatch(setUploadFlag(state)),
        setPlayFlag: (state: SongItem | null) => dispatch(setPlayFlag(state)),
        setDownloadFlag: (state: boolean) => dispatch(setDownloadFlag(state)),
        setRecentFlag: (state: boolean) => dispatch(setRecentFlag(state))
    }
}

export default flagSlice.reducer