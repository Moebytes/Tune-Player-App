/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Tune Player - A cute music player ❤                       *
 * Copyright © 2026 Moebytes <moebytes.com>                  *
 * Licensed under CC BY-NC 4.0. See license.txt for details. *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

import "bootstrap/dist/css/bootstrap.min.css"
import React from "react"
import {createRoot} from "react-dom/client"
import {Provider} from "react-redux"
import TitleBar from "./components/TitleBar"
import RecentPlays from "./components/RecentPlays"
import AudioPlayer from "./components/AudioPlayer"
import Sheets from "./sheets/Sheets"
import LocalStorage from "./LocalStorage"
import store from "./store"
import "./index.less"

const App: React.FunctionComponent = () => {
  return (
    <main className="app">
      <TitleBar/>
      <Sheets/>
      <LocalStorage/>
      <RecentPlays/>
      <AudioPlayer/>
    </main>
  )
}

const root = createRoot(document.getElementById("root")!)
root.render(<Provider store={store}><App/></Provider>)