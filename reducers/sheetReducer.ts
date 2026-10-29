/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import {createSlice} from "@reduxjs/toolkit"
import {useSelector, useDispatch} from "react-redux"
import type {StoreState, StoreDispatch} from "../store"

const sheetSlice = createSlice({
    name: "sheet",
    initialState: {
        showSpeedSheet: false,
        showPitchSheet: false,
        showABLoopSheet: false
    },
    reducers: {
        setShowSpeedSheet: (state, action) => {state.showSpeedSheet = action.payload},
        setShowPitchSheet: (state, action) => {state.showPitchSheet = action.payload},
        setShowABLoopSheet: (state, action) => {state.showABLoopSheet = action.payload}
    }
})

const {
    setShowSpeedSheet, setShowPitchSheet, setShowABLoopSheet
} = sheetSlice.actions

export const useSheetSelector = () => {
    const selector = useSelector.withTypes<StoreState>()
    return {
        showSpeedSheet: selector((state) => state.sheet.showSpeedSheet),
        showPitchSheet: selector((state) => state.sheet.showPitchSheet),
        showABLoopSheet: selector((state) => state.sheet.showABLoopSheet)
    }
}

export const useSheetActions = () => {
    const dispatch = useDispatch.withTypes<StoreDispatch>()()
    return {
        setShowSpeedSheet: (state: boolean) => dispatch(setShowSpeedSheet(state)),
        setShowPitchSheet: (state: boolean) => dispatch(setShowPitchSheet(state)),
        setShowABLoopSheet: (state: boolean) => dispatch(setShowABLoopSheet(state))
    }
}

export default sheetSlice.reducer