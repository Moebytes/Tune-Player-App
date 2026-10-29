package com.moebytes.tuneplayer.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.ResultReceiver;
import androidx.core.content.ContextCompat;

public class BackgroundAudioService extends Service {
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private MediaSession session;
    private PowerManager.WakeLock wakeLock;
    private boolean focused;

    static final String PAUSED = "com.moebytes.tuneplayer.mobile.AUDIO_PAUSED";
    private static final String PAUSE = "com.moebytes.tuneplayer.mobile.PAUSE_AUDIO";
    private static final String CHANNEL = "audio_playback";

    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        if (change < 0) pausePlayback();
    };

    private final BroadcastReceiver noisyReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) { pausePlayback(); }
    };

    @Override public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            getSystemService(NotificationManager.class).createNotificationChannel(
                new NotificationChannel(CHANNEL, "Music playback", NotificationManager.IMPORTANCE_LOW));

            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                .setWillPauseWhenDucked(true)
                .setOnAudioFocusChangeListener(focusListener, new Handler(Looper.getMainLooper())).build();
        }

        session = new MediaSession(this, "Tune Player");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPause() { pausePlayback(); }
            @Override public void onStop() { pausePlayback(); }
        });

        ContextCompat.registerReceiver(this, noisyReceiver,
            new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY), ContextCompat.RECEIVER_EXPORTED);

        wakeLock = ((PowerManager) getSystemService(POWER_SERVICE))
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TunePlayer:Playback");
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || PAUSE.equals(intent.getAction())) {
            pausePlayback();
            return START_NOT_STICKY;
        }

        String title = intent.getStringExtra("title");

        session.setMetadata(new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title).build());

        session.setPlaybackState(new PlaybackState.Builder()
            .setActions(PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_STOP)
            .setState(PlaybackState.STATE_PLAYING, PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1).build());
        session.setActive(true);

        PendingIntent open = PendingIntent.getActivity(this, 0,
            new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        PendingIntent pause = PendingIntent.getService(this, 1,
            new Intent(this, BackgroundAudioService.class).setAction(PAUSE),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder notification = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);

        notification.setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title).setContentText("Tune Player").setContentIntent(open)
            .setOngoing(true).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_TRANSPORT)
            .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_pause, "Pause", pause).build())
            .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0));
            
        startForeground(1001, notification.build());
        if (!focused) {
            int result = Build.VERSION.SDK_INT >= 26 ? audioManager.requestAudioFocus(focusRequest)
                : audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            focused = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }
        ResultReceiver receiver = intent.getParcelableExtra("result");
        
        if (focused) {
            if (!wakeLock.isHeld()) wakeLock.acquire();
            if (receiver != null) receiver.send(1, null);
        } else {
            if (receiver != null) receiver.send(0, null);
            pausePlayback();
        }

        return START_NOT_STICKY;
    }

    private void pausePlayback() {
        sendBroadcast(new Intent(PAUSED).setPackage(getPackageName()));
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override public void onDestroy() {
        unregisterReceiver(noisyReceiver);
        if (focused) {
            if (Build.VERSION.SDK_INT >= 26) audioManager.abandonAudioFocusRequest(focusRequest);
            else audioManager.abandonAudioFocus(focusListener);
        }
        session.setActive(false);
        session.release();
        if (wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}