import type {CapacitorConfig} from "@capacitor/cli"

let liveReload = false

const config: CapacitorConfig = {
    appId: "com.moebytes.tuneplayer.mobile",
    appName: "Tune Player",
    webDir: "dist",
    server: {
        url: liveReload ? "https://192.168.1.180:8082" : undefined,
        cleartext: false
    }
}
export default config