package net.readbook.reader;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/** Offline reader: only packaged assets are loaded; file access uses Android's picker. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String HOME = "https://" + HOST + "/assets/index.html";
    private static final int PICK_FILE = 10, SAVE_FILE = 11;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingExport;
    private boolean saving;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) pendingExport = state.getString("pendingExport");
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(245, 245, 245));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
                return WindowInsets.CONSUMED;
            });
        }
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(245, 245, 245));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Only URIs explicitly granted by the system picker.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setTextZoom(100);
        settings.setSupportMultipleWindows(false);
        web.addJavascriptInterface(new ExportBridge(), "ReadBookAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();
                if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost())
                    || path == null || !path.startsWith("/assets/") || !"GET".equals(request.getMethod())) {
                    return errorResponse(403, "Forbidden");
                }
                String asset = path.substring(8);
                if (asset.contains("..") || asset.contains("\\")) return errorResponse(403, "Forbidden");
                try {
                    return new WebResourceResponse(mime(asset), "UTF-8", 200, "OK",
                        Collections.singletonMap("Cache-Control", "no-store"), getAssets().open("www/" + asset));
                } catch (IOException e) { return errorResponse(404, "Not Found"); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOME.equals(request.getUrl().toString());
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("*/*");
                // TXT/EPUB MIME labels vary between file managers; do not hide valid books.
                if (params.getAcceptTypes().length > 0 && params.getAcceptTypes()[0].startsWith("image/")) {
                    pick.setType("image/*");
                }
                pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(pick, PICK_FILE); }
                catch (android.content.ActivityNotFoundException e) {
                    fileCallback.onReceiveValue(null); fileCallback = null;
                    Toast.makeText(MainActivity.this, "请先安装系统文件管理器", Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::onBackPressed);
        }
        web.loadUrl(HOME);
    }

    private static WebResourceResponse errorResponse(int status, String reason) {
        return new WebResourceResponse("text/plain", "UTF-8", status, reason,
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private static String mime(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    public final class ExportBridge {
        @JavascriptInterface public void exportText(String name, String text) {
            runOnUiThread(() -> {
                if (saving || pendingExport != null) return;
                pendingExport = text;
                Intent create = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                create.addCategory(Intent.CATEGORY_OPENABLE);
                create.setType("text/plain");
                create.putExtra(Intent.EXTRA_TITLE, name == null ? "未命名.txt" : name);
                try { startActivityForResult(create, SAVE_FILE); }
                catch (android.content.ActivityNotFoundException e) {
                    pendingExport = null;
                    Toast.makeText(MainActivity.this, "无法打开保存窗口", Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_FILE && fileCallback != null) {
            Uri[] uris = WebChromeClient.FileChooserParams.parseResult(result, data);
            fileCallback.onReceiveValue(uris); fileCallback = null;
        } else if (request == SAVE_FILE) {
            String content = pendingExport; pendingExport = null;
            if (result == RESULT_OK && data != null && data.getData() != null && content != null) {
                Uri destination = data.getData(); saving = true;
                new Thread(() -> {
                    boolean success = false;
                    try (OutputStream out = getContentResolver().openOutputStream(destination, "wt")) {
                        if (out == null) throw new IOException("No output stream");
                        out.write(content.getBytes(StandardCharsets.UTF_8)); success = true;
                    } catch (IOException e) { /* Report the failure below. */ }
                    final boolean saved = success;
                    runOnUiThread(() -> {
                        saving = false;
                        Toast.makeText(MainActivity.this, saved ? "已导出" : "导出失败，请重试", Toast.LENGTH_SHORT).show();
                    });
                }, "readbook-export").start();
            }
        }
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        out.putString("pendingExport", pendingExport);
        super.onSaveInstanceState(out);
    }
    @Override protected void onPause() {
        web.evaluateJavascript("if(typeof pauseReadingSession==='function')pauseReadingSession();", null);
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("if(typeof currentBook!=='undefined'&&currentBook&&!document.getElementById('readerView').hidden)startReadingSession(currentBook.id);", null);
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(()=>{const modal=document.querySelector('.modal-mask');if(modal){modal.click();return true;}"
            + "if(typeof drawerOpen!=='undefined'&&drawerOpen){closeDrawer();return true;}"
            + "if(document.getElementById('writerDrawer').classList.contains('open')){closeWriterDrawer();return true;}"
            + "if(!document.getElementById('readerView').hidden){exitReader();return true;}"
            + "if(!document.getElementById('profileBooksView').hidden){closeProfileBooks();return true;}"
            + "return false;})()", handled -> {
                if (!"true".equals(handled)) finish();
            });
    }
    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        web.removeJavascriptInterface("ReadBookAndroid");
        web.destroy();
        super.onDestroy();
    }
}
