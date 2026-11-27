# Makson native pixel shell (private local preview)
This candidate keeps the original Makson scene, starfield, orbit controller, app icons and native windows. The catalogue has one shared bitmap surface; header and sphere stay the native scene, not a recreated screenshot. The catalog is on the left on desktop and wide phone layouts, and opens as a lower drawer on portrait phones. All app actions stay on buttons with native keyboard focus. The original native chrome stays available in Forced Colors.
 
To preview from the repository root, start the normal server:
 
    HOST=127.0.0.1 PORT=4357 node server.js
 
In a separate shell:
 
    MAKSON_RELEASE_DIR="$PWD" MAKSON_PREVIEW_SHELL=native python3 preview-native/serve_preview.py
 
Open http://127.0.0.1:4356/?framebuffer=1. This read-only preview does not authenticate, post, upload or deploy, and blocks real API mutations. Launch the normal runtime only on an isolated machine with no production credentials. To check the original shell in the same preview, omit framebuffer from the URL.
 
Local Chromium coverage: 320×568 at 180%, 390×844, 667×375 at 180%, desktop 1366×900. Native stars and nine original sphere nodes, rasterized catalog icons, native Montage/Settings/Svyaz opens, focus restoration, and exact sphere position after closing. Not deployed to production.
 
The unified home frame uses a logical cell of 3 CSS pixels on narrow/touch displays and 4 on desktop. The original, interactive orbit renderer emits at the same resolution in preview; its frame, stars, rendered native icon sprites, title, and catalogue all land at integer cells in the viewport canvas. Native nodes still own clicks, keyboard and drag; open apps restore the native UI. This is intentionally a shell experiment, not a claim that opened apps are rasterized or a default production change.
