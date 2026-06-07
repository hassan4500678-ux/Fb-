package com.faizanbrothers.ems;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class ApiClient {
    interface Callback {
        void onSuccess(String body);
        void onError(String message, int statusCode);
    }

    private final Context context;
    private final TokenVault tokenVault;
    private final ExecutorService executor = Executors.newFixedThreadPool(4);
    private final String baseUrl;

    ApiClient(Context context, TokenVault tokenVault) {
        this.context = context.getApplicationContext();
        this.tokenVault = tokenVault;
        this.baseUrl = BuildConfig.API_BASE_URL.replaceAll("/+$", "");
    }

    boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        Network active = cm.getActiveNetwork();
        NetworkCapabilities capabilities = active == null ? null : cm.getNetworkCapabilities(active);
        return capabilities != null && (
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                        || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                        || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        );
    }

    void get(String path, Callback callback) {
        request("GET", path, null, callback, 0);
    }

    void post(String path, String json, Callback callback) {
        request("POST", path, json, callback, 0);
    }

    private void request(String method, String path, String json, Callback callback, int attempt) {
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(baseUrl + path);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod(method);
                connection.setConnectTimeout(3500);
                connection.setReadTimeout(4500);
                connection.setRequestProperty("Accept", "application/json");
                String token = tokenVault.getToken();
                if (token != null) connection.setRequestProperty("Authorization", "Bearer " + token);
                if (json != null) {
                    connection.setDoOutput(true);
                    connection.setRequestProperty("Content-Type", "application/json");
                    try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(connection.getOutputStream(), StandardCharsets.UTF_8))) {
                        writer.write(json);
                    }
                }
                int code = connection.getResponseCode();
                String body = read(code >= 400 ? connection.getErrorStream() : connection.getInputStream());
                if (code == 401) tokenVault.clear();
                if (code >= 200 && code < 300) {
                    callback.onSuccess(body);
                } else if (attempt < 2 && (code == 429 || code >= 500)) {
                    sleep(400L * (attempt + 1));
                    request(method, path, json, callback, attempt + 1);
                } else {
                    callback.onError(body.isEmpty() ? "Request failed" : body, code);
                }
            } catch (IOException error) {
                if (attempt < 2) {
                    sleep(400L * (attempt + 1));
                    request(method, path, json, callback, attempt + 1);
                } else {
                    callback.onError(error.getMessage(), 0);
                }
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private static String read(InputStream stream) throws IOException {
        if (stream == null) return "";
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) builder.append(line);
        }
        return builder.toString();
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
    }
}
