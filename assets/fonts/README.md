# Bundled reading fonts

Fonts are served from this app's own origin, loaded only when the selected family is used, and cached by the existing service worker after a successful request. Full character coverage from each distributed font is retained; no character subsetting was applied. The bold body weight is retained for the default sans option; the serif option uses its regular style. Chapter headings and app UI are not affected by the preference.

All fonts are distributed under SIL Open Font License 1.1. The original copyright/license notices are retained beside each font.

| UI name | Source | Revision | Source file |
| --- | --- | --- | --- |
| 思源黑体 | https://github.com/adobe-fonts/source-han-sans | a4f7cf94edfb9d7ffbdfc4841de276358bd7e0f2 | SubsetOTF/CN/SourceHanSansCN-Bold.otf |
| 屏显臻宋 | https://github.com/airinghost/clear-han-serif-subset (font by chncwk) | d32c8d142f81dd0c203a8b5f149c22a29ad3f769 | woff2/clearhanserif.original.v1.10.woff2 |

Except for the already supplied Clear Han Serif WOFF2, source OTF/TTF files were losslessly compressed to WOFF2 with fontTools. Names, glyph outlines and Unicode coverage were preserved. These web fonts are part of the application rather than standalone desktop font downloads.
