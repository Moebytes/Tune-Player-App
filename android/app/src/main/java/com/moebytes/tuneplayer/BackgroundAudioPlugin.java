package com.moebytes.tuneplayer;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ResultReceiver;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {
    private final BroadcastReceiver pauseReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            notifyListeners("pause", new JSObject(), true);
        }
    };

    @Override public void load() {
        ContextCompat.registerReceiver(getContext(), pauseReceiver,
            new IntentFilter(BackgroundAudioService.PAUSED), ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @PluginMethod public void start(PluginCall call) {
        Intent intent = new Intent(getContext(), BackgroundAudioService.class);
        intent.putExtra("title", call.getString("title", "Tune Player"));
        intent.putExtra("result", new ResultReceiver(new Handler(Looper.getMainLooper())) {
            @Override protected void onReceiveResult(int resultCode, Bundle resultData) {
                if (resultCode == 1) call.resolve();
            }
        });

        try {
            ContextCompat.startForegroundService(getContext(), intent);
        } catch (Exception error) {
            call.reject("Error starting playback", error);
        }
    }

    @PluginMethod public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), BackgroundAudioService.class));
        call.resolve();
    }

    @Override protected void handleOnDestroy() {
        getContext().unregisterReceiver(pauseReceiver);
        getContext().stopService(new Intent(getContext(), BackgroundAudioService.class));
    }
}