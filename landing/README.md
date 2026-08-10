# ReachIQ download landing page

Responsive, dependency-free download page for the ReachIQ mobile application.

## Release downloads

The page is configured for `emperor1234/epotal`. It reads the latest release
through GitHub's API and sends Android visitors to the actual `.apk` asset.
When a release has no APK, the page says so instead of offering a broken
download.

- Release page: `https://github.com/emperor1234/epotal/releases/latest`

## Publishing a release

The `.github/workflows/mobile-release.yml` workflow builds the Expo `preview`
profile as an installable APK and attaches it to a GitHub release as
`ReachIQ.apk`. Before using it:

1. From `reachiq-app/`, run `npx eas-cli init` once and commit the generated
   `extra.eas.projectId` in `app.json`.
2. Complete one interactive Android EAS build so Expo can create or register
   the signing credentials.
3. Add an Expo access token as the GitHub Actions secret `EXPO_TOKEN`.
4. Publish a GitHub release, or run **Publish mobile release** manually and
   provide an existing release tag.

The workflow stops with a clear setup error if the Expo project ID or token is
missing.

## iPhone distribution

A normal `.ipa` file uploaded to GitHub Releases cannot be installed by general iPhone users. Publish the iOS build through TestFlight, then set `TESTFLIGHT_URL` near the bottom of `index.html` to its public testing link.

Until that link is configured, iPhone visitors are sent to the latest GitHub Release to see the current iOS status.

## Hosting

The page is a single static HTML file. Deploy `landing/` using its Dockerfile or any static host. No build command or server-side environment variables are required.
