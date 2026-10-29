import {defineConfig} from "@rsbuild/core"
import {pluginReact} from "@rsbuild/plugin-react"
import {pluginLess} from "@rsbuild/plugin-less"
import {createRequire} from "module"
import path from "path"
import fs from "fs"

const require = createRequire(import.meta.url)

export default defineConfig({
    resolve: {
        alias: {
            tone: path.resolve(process.cwd(), "node_modules/tone/build/esm/index.js")
        }
    },
    tools: {
        rspack(config) {
            config.resolve = config.resolve || {}
            config.module = config.module || {}
            config.module.rules = config.module.rules || []

            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                buffer: require.resolve("buffer/")
            }

            config.module.rules.push({
                test: /\.svg$/,
                type: "javascript/auto",
                use: [{
                    loader: "@svgr/webpack", 
                    options: {
                        svgoConfig: {
                            plugins: [
                                {name: "preset-default", params: {overrides: {removeViewBox: false}}}
                            ]
                        }
                    }
                }]
            })

            return config
        }
    },
    plugins: [
        pluginReact(),
        pluginLess()
    ],
    server: {
        host: "0.0.0.0",
        port: 8082,
        strictPort: true,
        https: {
            key: fs.readFileSync("./certs/key.pem"),
            cert: fs.readFileSync("./certs/cert.pem")
        }
    },
    source: {
        entry: {index: "./App.tsx"}
    },
    html: {
        template: "./index.html"
    },
    output: {
        target: "web",
        assetPrefix: "/",
        minify: true,
        dataUriLimit: 0,
        filenameHash: false,
        sourceMap: false,
        legalComments: "none",
        distPath: {root: "./dist"},
        copy: [
            {from: "structures/bitcrusher.js", to: "[name][ext]"},
            {from: "structures/soundtouch.js", to: "[name][ext]"},
            {from: "structures/lfo.js", to: "[name][ext]"}
        ]
    }
})