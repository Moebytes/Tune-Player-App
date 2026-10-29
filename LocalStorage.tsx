/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import React, {useEffect, useState} from "react"
import {Preferences} from "@capacitor/preferences"
import {useThemeSelector, useThemeActions} from "./store"
import {Themes} from "./reducers/themeReducer"

const lightColorList = {
	"--closeButton": "#ff497d",
	"--minimizeButton": "#ff399c",
	"--maximizeButton": "#ff2eb9",
	"--background": "#ffffff",
	"--navColor": "#ffd6e5",
	"--iconColor": "#ff63a1",
	"--textColor": "#000000",
	"--barColor": "#ffffff"
}

const darkColorList = {
	"--closeButton": "#ff497d",
	"--minimizeButton": "#ff399c",
	"--maximizeButton": "#ff2eb9",
	"--background": "#000000",
	"--navColor": "#29091e",
	"--iconColor": "#ff4c94",
	"--textColor": "#ffffff",
	"--barColor": "#000000"
}

const LocalStorage: React.FunctionComponent = () => {
    const {theme} = useThemeSelector()
    const {setTheme} = useThemeActions()
    const [themeLoaded, setThemeLoaded] = useState(false)

    useEffect(() => {
        if (typeof window === "undefined") return
        const colorList = theme.includes("light") ? lightColorList : darkColorList

        for (let i = 0; i < Object.keys(colorList).length; i++) {
            const key = Object.keys(colorList)[i]
            const color = Object.values(colorList)[i]
            document.documentElement.style.setProperty(key, color)
        }

    }, [theme])

	useEffect(() => {
		if (!themeLoaded) return
		Preferences.set({key: "theme", value: theme})
	}, [theme, themeLoaded])

	useEffect(() => {
		const initTheme = async () => {
			const {value} = await Preferences.get({key: "theme"})
			if (value) setTheme(value as Themes)
			setThemeLoaded(true)
		}
		initTheme()
	}, [])

    return null
}

export default LocalStorage