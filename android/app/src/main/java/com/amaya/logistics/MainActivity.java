package com.amaya.logistics;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SwipeRefreshLayout swipeRefreshLayout;
    private ProgressBar progressBar;

    // ✅ LIVE GITHUB PAGES URL — Update this after GitHub Pages is enabled
    private static final String APP_URL = "https://deskamarx.github.io/logistics-mis-command-center/";
    private static final String OFFLINE_HTML = "<html><body style='background:#070b14;color:#f0f4ff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center'><div><p style='font-size:3rem'>📡</p><h2>No Connection</h2><p style='color:#8892aa;margin-top:0.5rem'>Please check your internet and try again.</p><button onclick='location.reload()' style='margin-top:1.5rem;padding:0.75rem 2rem;background:#6366f1;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer'>Retry</button></div></body></html>";

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        swipeRefreshLayout = findViewById(R.id.swipeRefresh);
        progressBar = findViewById(R.id.progressBar);

        // --- WebView Settings ---
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(isNetworkAvailable() ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_CACHE_ELSE_NETWORK);
        settings.setUserAgentString(settings.getUserAgentString() + " AmayaMIS/3.0 (Android)");

        // --- Swipe Refresh color ---
        swipeRefreshLayout.setColorSchemeColors(0xFF6366F1, 0xFF06B6D4, 0xFF10B981);
        swipeRefreshLayout.setProgressBackgroundColorSchemeColor(0xFF0D1224);

        // --- Android Bridge ---
        webView.addJavascriptInterface(new AndroidBridge(this), "AndroidNative");

        // --- WebViewClient ---
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                swipeRefreshLayout.setRefreshing(false);
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (!isNetworkAvailable()) {
                    view.loadData(OFFLINE_HTML, "text/html", "UTF-8");
                }
            }
        });

        // --- WebChromeClient ---
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                if (newProgress == 100) progressBar.setVisibility(View.GONE);
            }
        });

        // --- Swipe to Refresh ---
        swipeRefreshLayout.setOnRefreshListener(() -> {
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            webView.reload();
        });

        // --- Back Button (non-deprecated) ---
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        // --- Load App ---
        webView.loadUrl(APP_URL);
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
            return caps != null && (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
        } else {
            android.net.NetworkInfo info = cm.getActiveNetworkInfo();
            return info != null && info.isConnectedOrConnecting();
        }
    }

    public static class AndroidBridge {
        final Context mContext;
        AndroidBridge(Context c) { mContext = c; }

        @JavascriptInterface
        public void showToast(String message) {
            Toast.makeText(mContext, message, Toast.LENGTH_SHORT).show();
        }

        @JavascriptInterface
        public String getAppVersion() { return "3.0.0"; }

        @JavascriptInterface
        public boolean isAndroid() { return true; }
    }
}
