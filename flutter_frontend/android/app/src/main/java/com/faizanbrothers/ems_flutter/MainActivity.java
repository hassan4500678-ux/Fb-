package com.faizanbrothers.ems_flutter;

import android.content.SharedPreferences;

import io.flutter.embedding.android.FlutterActivity;
import io.flutter.embedding.engine.FlutterEngine;
import io.flutter.plugin.common.MethodChannel;

public class MainActivity extends FlutterActivity {
    private static final String CHANNEL = "faizan_brothers_ems/secure_store";
    private static final String PREFS = "fb_ems_private_store";

    @Override
    public void configureFlutterEngine(FlutterEngine flutterEngine) {
        super.configureFlutterEngine(flutterEngine);
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        new MethodChannel(flutterEngine.getDartExecutor().getBinaryMessenger(), CHANNEL)
                .setMethodCallHandler((call, result) -> {
                    String key = call.argument("key");
                    if (key == null || key.trim().isEmpty()) {
                        result.error("invalid_key", "A non-empty key is required", null);
                        return;
                    }

                    switch (call.method) {
                        case "read":
                            result.success(prefs.getString(key, null));
                            break;
                        case "write":
                            String value = call.argument("value");
                            prefs.edit().putString(key, value == null ? "" : value).apply();
                            result.success(true);
                            break;
                        case "delete":
                            prefs.edit().remove(key).apply();
                            result.success(true);
                            break;
                        case "clear":
                            prefs.edit().clear().apply();
                            result.success(true);
                            break;
                        default:
                            result.notImplemented();
                    }
                });
    }
}
