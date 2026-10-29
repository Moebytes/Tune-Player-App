import UIKit
import Capacitor
import AVFAudio
import MediaPlayer

@objc(BackgroundAudioPlugin)
class BackgroundAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "BackgroundAudioPlugin"
    let jsName = "BackgroundAudio"

    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateNowPlaying", returnType: CAPPluginReturnPromise)
    ]

    private var observers: [NSObjectProtocol] = []
    private var playing = false
    private let sessionQueue = DispatchQueue(label: "com.moebytes.tuneplayer.audio-session")
    private var needsReactivation = false
    private var trackID = ""
    private var metadata: [String: Any] = [:]
    private var metadataTime = ProcessInfo.processInfo.systemUptime
    private var commandTargets: [(MPRemoteCommand, Any)] = []

    override func load() {
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: AVAudioSession.interruptionNotification,
                                            object: nil, queue: .main) { [weak self] notification in
            guard let type = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  type == AVAudioSession.InterruptionType.began.rawValue else { return }
            if let self = self {
                self.sessionQueue.async { self.needsReactivation = true }
                self.pausePlayback()
            }
        })

        observers.append(center.addObserver(forName: AVAudioSession.routeChangeNotification,
                                            object: nil, queue: .main) { [weak self] notification in
            guard let reason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
                  reason == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue else { return }
            self?.pausePlayback()
        })
    }

    private func registerNativeCommands() {
        guard commandTargets.isEmpty else { return }

        let commands = MPRemoteCommandCenter.shared()
        addCommand(commands.playCommand, action: "play")
        addCommand(commands.pauseCommand, action: "pause")
        addCommand(commands.togglePlayPauseCommand, action: "toggle")

        let seek = commands.changePlaybackPositionCommand
        seek.isEnabled = true

        let target = seek.addTarget { [weak self] event in
            guard let self = self,
                  let position = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            return self.sendCommand(action: "seek", position: position.positionTime)
        }
        commandTargets.append((seek, target))
    }

    private func pausePlayback() {
        guard playing else { return }
        playing = false
        freezeProgress()
        notifyListeners("pause", data: [:], retainUntilConsumed: true)
    }

    @objc func start(_ call: CAPPluginCall) {
        sessionQueue.async {
            do {
                let session = AVAudioSession.sharedInstance()
                if session.category != .playback {
                    try session.setCategory(.playback, mode: .default)
                }
                if self.needsReactivation {
                    try session.setActive(true)
                    self.needsReactivation = false
                }
                DispatchQueue.main.async {
                    self.playing = true
                    call.resolve()
                }
            } catch {
                DispatchQueue.main.async {
                    call.reject("Failed to activate audio session", nil, error)
                }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.playing = false
            self.freezeProgress()
            call.resolve()
        }
    }

    private func addCommand(_ command: MPRemoteCommand, action: String) {
        command.isEnabled = true
        let target = command.addTarget { [weak self] _ in
            self?.sendCommand(action: action) ?? .commandFailed
        }
        commandTargets.append((command, target))
    }

    private func sendCommand(action: String, position: Double? = nil) -> MPRemoteCommandHandlerStatus {
        let send = { () -> MPRemoteCommandHandlerStatus in
            guard !self.trackID.isEmpty else { return .noSuchContent }
            let resolved = action == "toggle" ? (self.playing ? "pause" : "play") : action
            var data: [String: Any] = ["action": resolved, "trackID": self.trackID]
            if resolved == "seek" {
                guard let position = position, position.isFinite else { return .commandFailed }
                let duration = self.metadata[MPMediaItemPropertyPlaybackDuration] as? Double ?? 0
                data["position"] = min(duration, max(0, position))
            }
            if resolved == "pause" {
                self.playing = false
                self.freezeProgress()
            }
            self.notifyListeners("command", data: data, retainUntilConsumed: true)
            return .success
        }
        if Thread.isMainThread { return send() }
        return DispatchQueue.main.sync(execute: send)
    }

    private func freezeProgress() {
        guard !metadata.isEmpty else { return }
        let now = ProcessInfo.processInfo.systemUptime
        let elapsed = metadata[MPNowPlayingInfoPropertyElapsedPlaybackTime] as? Double ?? 0
        let rate = metadata[MPNowPlayingInfoPropertyPlaybackRate] as? Double ?? 0
        let duration = metadata[MPMediaItemPropertyPlaybackDuration] as? Double ?? 0
        metadata[MPNowPlayingInfoPropertyElapsedPlaybackTime] = min(duration, max(0, elapsed + (now - metadataTime) * rate))
        metadata[MPNowPlayingInfoPropertyPlaybackRate] = 0.0
        metadataTime = now
        MPNowPlayingInfoCenter.default().nowPlayingInfo = metadata
    }

    @objc func updateNowPlaying(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let id = call.getString("trackID"), !id.isEmpty else {
                call.reject("trackID is required")
                return
            }
            self.registerNativeCommands()

            if self.trackID != id {
                self.trackID = id
                self.metadata = [:]
            }
            
            let duration = max(0, call.getDouble("duration") ?? 0)
            let elapsed = min(duration, max(0, call.getDouble("elapsed") ?? 0))
            let rate = max(-1.0, min(1.0, call.getDouble("rate") ?? 0))
            self.playing = rate != 0

            self.metadata[MPMediaItemPropertyTitle] = call.getString("title") ?? "Audio"
            self.metadata[MPMediaItemPropertyPlaybackDuration] = duration
            self.metadata[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed
            self.metadata[MPNowPlayingInfoPropertyPlaybackRate] = rate
            self.metadata[MPNowPlayingInfoPropertyDefaultPlaybackRate] = 1.0
            self.metadata[MPNowPlayingInfoPropertyMediaType] = MPNowPlayingInfoMediaType.audio.rawValue

            if let artwork = call.getString("artwork") {
                self.metadata.removeValue(forKey: MPMediaItemPropertyArtwork)
                if let comma = artwork.firstIndex(of: ","),
                   let data = Data(base64Encoded: String(artwork[artwork.index(after: comma)...])),
                   let image = UIImage(data: data) {
                    self.metadata[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                }
            }

            self.metadataTime = ProcessInfo.processInfo.systemUptime
            MPNowPlayingInfoCenter.default().nowPlayingInfo = self.metadata
            call.resolve()
        }
    }

    deinit {
        for (command, target) in commandTargets { command.removeTarget(target) }
        for observer in observers { NotificationCenter.default.removeObserver(observer) }
    }
}
