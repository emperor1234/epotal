# ReachIQ download landing page

A single self-contained `index.html` — no build step, no dependencies. Two
buttons: Android APK download, iOS TestFlight.

## Before deploying: get your real links

**Android** — build the APK (see `../reachiq-app/README` build steps) and
copy the download link it prints:
```bash
cd ../reachiq-app
eas build --platform android --profile preview
```
EAS prints a URL like `https://expo.dev/artifacts/eas/xxxxxxxx.apk` when the
build finishes — that's a permanent download link, paste it into
`APK_URL` in `index.html`.

(Alternative: if you'd rather not depend on Expo's artifact URL staying
around, download the `.apk` yourself and re-upload it somewhere you control
— e.g. this same static host, or any object storage with a public URL —
then point `APK_URL` at that instead.)

**iOS** — there's no equivalent of "download an .apk" on iOS; Apple doesn't
allow installing an app outside the App Store or Apple's own developer
tooling. The realistic option for a private build is **TestFlight**:
1. You need an Apple Developer Program account ($99/yr).
2. `eas build --platform ios --profile preview` (or `production`), then
   `eas submit --platform ios` to upload it to App Store Connect.
3. Add your friend's email as an internal tester in App Store Connect (or
   turn on public TestFlight link, up to 10,000 testers, no email
   allowlist needed).
4. Paste the TestFlight link into `TESTFLIGHT_URL` in `index.html`.

Until both are filled in, the page shows the Android button as
"build not published yet" and hides the iOS button — it's safe to deploy
before either build exists, you just update this one file and redeploy
when the links are ready.

## Hosting options

Pick whichever is least friction — it's one static file:

- **Coolify**: New Resource → Dockerfile, point at this folder. Or even
  simpler, Coolify's "Static Site" resource type if available — just needs
  `index.html`.
- **Vercel / Netlify / Cloudflare Pages**: drag-and-drop `index.html`, or
  connect the repo and set the root directory to `landing/`. No build
  command needed.
- **GitHub Pages**: enable Pages on this repo, set source to `landing/`.

## Updating the links later

No redeploy-the-whole-app needed — just edit the two `const` values at the
bottom of `index.html` and redeploy (or, if your host serves straight from
the repo, just push the change).
