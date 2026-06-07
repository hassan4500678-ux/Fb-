package com.faizanbrothers.ems;

import org.json.JSONException;
import org.json.JSONObject;

final class SimpleJson {
    private SimpleJson() {}

    static String loginPayload(String email, String password) {
        JSONObject json = new JSONObject();
        try {
            json.put("email", email);
            json.put("password", password);
        } catch (JSONException ignored) {
        }
        return json.toString();
    }

    static String string(JSONObject json, String key, String fallback) {
        if (json == null) return fallback;
        return json.optString(key, fallback);
    }

    static double number(JSONObject json, String key, double fallback) {
        if (json == null) return fallback;
        return json.optDouble(key, fallback);
    }

    static JSONObject object(JSONObject json, String key) {
        if (json == null) return new JSONObject();
        return json.optJSONObject(key) == null ? new JSONObject() : json.optJSONObject(key);
    }
}
