package com.stormwatcher.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Lock WebView text zoom to 100% — prevents system font size setting from scaling the app
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
