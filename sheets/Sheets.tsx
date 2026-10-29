/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import React from "react"
import SpeedSheet from "./SpeedSheet"
import PitchSheet from "./PitchSheet"
import ABLoopSheet from "./ABLoopSheet"

const Sheets: React.FunctionComponent = () => {
    return (
        <>
        <SpeedSheet/>
        <PitchSheet/>
        <ABLoopSheet/>
        </>
    )
}

export default Sheets