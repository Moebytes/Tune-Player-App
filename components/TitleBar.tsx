/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import React from "react"
import {useThemeSelector, useThemeActions} from "../store"
import Icon from "../assets/svg/icon.svg"
import LightIcon from "../assets/svg/light.svg"
import DarkIcon from "../assets/svg/dark.svg"
import "./styles/titlebar.less"

const TitleBar: React.FunctionComponent = () => {
    const {theme} = useThemeSelector()
    const {setTheme} = useThemeActions()

    const switchTheme = () => {
        setTheme(theme === "light" ? "dark" : "light")
    }

    return (
        <section className="title-bar">
            <div className="title-container">
                <Icon className="app-icon"/>
                <span className="title">Tune Player</span>
                {theme === "dark" ?
                <DarkIcon className="theme-icon" onClick={switchTheme}/> :
                <LightIcon className="theme-icon" onClick={switchTheme}/>}
            </div>
        </section>
    )
}

export default TitleBar