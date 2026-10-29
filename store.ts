/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import {configureStore} from "@reduxjs/toolkit"
import themeReducer, {useThemeSelector, useThemeActions} from "./reducers/themeReducer"
import playbackReducer, {usePlaybackSelector, usePlaybackActions} from "./reducers/playbackReducer"
import flagReducer, {useFlagSelector, useFlagActions} from "./reducers/flagReducer"
import sheetReducer, {useSheetSelector, useSheetActions} from "./reducers/sheetReducer"

const store = configureStore({
    reducer: {
        theme: themeReducer,
        playback: playbackReducer,
        flag: flagReducer,
        sheet: sheetReducer
    },
})

export type StoreState = ReturnType<typeof store.getState>
export type StoreDispatch = typeof store.dispatch

export {
    useThemeSelector, useThemeActions,
    usePlaybackSelector, usePlaybackActions,
    useFlagSelector, useFlagActions,
    useSheetSelector, useSheetActions
}

export default store