#!/usr/bin/env python3
"""Build a signed, offline APK with Android SDK 35 and JDK 17; no Gradle required."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parent
WEB = ROOT.parent
SDK = Path(os.environ['ANDROID_SDK_ROOT'])
TOOLS = SDK / 'build-tools' / '35.0.0'
PLATFORM = SDK / 'platforms' / 'android-35' / 'android.jar'
BUILD = ROOT / 'build'
SIGNING = ROOT / 'private-signing'

def run(*args, **kwargs):
    subprocess.run([str(a) for a in args], check=True, **kwargs)

def main():
    if BUILD.exists(): shutil.rmtree(BUILD)
    BUILD.mkdir()
    res = BUILD / 'res'
    shutil.copytree(ROOT / 'res', res)
    (res / 'drawable-nodpi').mkdir()
    # Adaptive icons need generous safe-area padding. Only resize; preserve the approved artwork.
    src = Image.open(WEB / 'icon-512v3.png').convert('RGB')
    foreground = Image.new('RGB', (432, 432), 'white')
    foreground.paste(src.resize((288, 288), Image.Resampling.LANCZOS), (72, 72))
    foreground.save(res / 'drawable-nodpi' / 'icon_foreground.png')
    assets = BUILD / 'assets' / 'www'
    assets.mkdir(parents=True)
    for name in ('theme.css', 'manifest.json', 'icon-180v3.png', 'icon-192v3.png', 'icon-512v3.png', 'icon-512-maskablev3.png'):
        shutil.copy2(WEB / name, assets / name)
    shutil.copytree(WEB / 'assets', assets / 'assets')
    html = (WEB / 'index.html').read_text()
    # The APK ships all assets; disable web updates so native export support stays coherent.
    old = 'if ("serviceWorker" in navigator) {'
    assert html.count(old) == 1
    html = html.replace(old, 'if (false && "serviceWorker" in navigator) {')
    old = 'function writerExport() {\n'
    assert html.count(old) == 1
    html = html.replace(old, old + '''  if (window.ReadBookAndroid) {
    const content = document.getElementById("editor").value;
    if (!content.trim()) { showToast("内容为空，无法导出"); return; }
    ReadBookAndroid.exportText(writerFile.name || "未命名.txt", content);
    return;
  }
''')
    (assets / 'index.html').write_text(html)
    run(TOOLS / 'aapt2', 'compile', '--dir', res, '-o', BUILD / 'resources.zip')
    run(TOOLS / 'aapt2', 'link', '-o', BUILD / 'unsigned.apk', '-I', PLATFORM,
        '--manifest', ROOT / 'AndroidManifest.xml', '-A', BUILD / 'assets', BUILD / 'resources.zip')
    classes = BUILD / 'classes'; classes.mkdir()
    sources = sorted((ROOT / 'src').rglob('*.java'))
    run('java', '-m', 'jdk.compiler/com.sun.tools.javac.Main', '-source', '8', '-target', '8',
        '-encoding', 'UTF-8', '-classpath', PLATFORM, '-d', classes, *sources)
    class_zip = BUILD / 'classes.jar'
    with zipfile.ZipFile(class_zip, 'w') as z:
        for p in classes.rglob('*.class'): z.write(p, p.relative_to(classes))
    dex = BUILD / 'dex'; dex.mkdir()
    run(TOOLS / 'd8', '--release', '--min-api', '26', '--lib', PLATFORM, '--output', dex, class_zip)
    with zipfile.ZipFile(BUILD / 'unsigned.apk', 'a', zipfile.ZIP_DEFLATED) as z:
        for p in dex.glob('*.dex'): z.write(p, p.name)
    run(TOOLS / 'zipalign', '-f', '-p', '4', BUILD / 'unsigned.apk', BUILD / 'aligned.apk')
    SIGNING.mkdir(mode=0o700, exist_ok=True)
    credentials = SIGNING / 'credentials.json'
    if not credentials.exists():
        credentials.write_text(json.dumps({'alias': 'readbook', 'password': secrets.token_urlsafe(32)}))
        credentials.chmod(0o600)
    keys = json.loads(credentials.read_text())
    env = os.environ.copy(); env['READBOOK_KEY_PASSWORD'] = keys['password']
    store = SIGNING / 'readbook.jks'
    if not store.exists():
        run('keytool', '-genkeypair', '-keystore', store, '-storetype', 'PKCS12',
            '-alias', keys['alias'], '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
            '-storepass:env', 'READBOOK_KEY_PASSWORD', '-keypass:env', 'READBOOK_KEY_PASSWORD',
            '-dname', 'CN=Read Book, O=Read Book, C=CN', env=env)
    output = BUILD / 'ReadBook-1.0.0.apk'
    run(TOOLS / 'apksigner', 'sign', '--ks', store, '--ks-key-alias', keys['alias'],
        '--ks-pass', 'env:READBOOK_KEY_PASSWORD', '--key-pass', 'env:READBOOK_KEY_PASSWORD',
        '--out', output, BUILD / 'aligned.apk', env=env)
    run(TOOLS / 'apksigner', 'verify', '--verbose', '--print-certs', output)
    run(TOOLS / 'aapt', 'dump', 'badging', output)
    print('APK:', output)
    print('SHA256:', hashlib.sha256(output.read_bytes()).hexdigest())

if __name__ == '__main__': main()
