package com.faizanbrothers.ems;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class TokenVault {
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String KEY_ALIAS = "faizan_brothers_ems_token_key";
    private static final String PREFS = "secure_session";
    private static final String TOKEN = "token";
    private static final String IV = "iv";

    private final SharedPreferences prefs;

    TokenVault(Context context) {
        this.prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        ensureKey();
    }

    void saveToken(String token) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getKey());
            byte[] encrypted = cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));
            prefs.edit()
                    .putString(TOKEN, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                    .putString(IV, Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
                    .apply();
        } catch (Exception error) {
            prefs.edit().putString(TOKEN, token).remove(IV).apply();
        }
    }

    String getToken() {
        String token = prefs.getString(TOKEN, null);
        String iv = prefs.getString(IV, null);
        if (token == null) return null;
        if (iv == null) return token;
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getKey(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
            byte[] decrypted = cipher.doFinal(Base64.decode(token, Base64.NO_WRAP));
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception error) {
            clear();
            return null;
        }
    }

    void clear() {
        prefs.edit().clear().apply();
    }

    private void ensureKey() {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            if (keyStore.containsAlias(KEY_ALIAS)) return;
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
            generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setRandomizedEncryptionRequired(true)
                    .build());
            generator.generateKey();
        } catch (Exception ignored) {
            // Very old or restricted devices fall back to private app storage in saveToken().
        }
    }

    private SecretKey getKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
    }
}
