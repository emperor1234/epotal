# ReachIQ download landing page

Responsive, dependency-free download page for the ReachIQ mobile application.

## Permanent release links

The page is already configured for `emperor1234/epotal` and uses GitHub's permanent latest-release URLs:

- Release page: `https://github.com/emperor1234/epotal/releases/latest`
- Android APK: `https://github.com/emperor1234/epotal/releases/latest/download/ReachIQ.apk`

Every GitHub Release must attach the Android file with the exact name `ReachIQ.apk`. The landing page will then download the latest version without requiring a redeploy.

## Publishing a release

1. Build the Android preview APK:

   ```bash
   cd ../reachiq-app
   eas build --platform android --profile preview
   ```

2. Download the completed artifact and rename it to `ReachIQ.apk`.
3. Create a GitHub release with a semantic tag such as `v1.0.1`.
4. Upload `ReachIQ.apk` as a release asset and publish the release.
5. Verify the permanent download URL above.

## iPhone distribution

A normal `.ipa` file uploaded to GitHub Releases cannot be installed by general iPhone users. Publish the iOS build through TestFlight, then set `TESTFLIGHT_URL` near the bottom of `index.html` to its public testing link.

Until that link is configured, iPhone visitors are sent to the latest GitHub Release to see the current iOS status.

## Hosting

The page is a single static HTML file. Deploy `landing/` using its Dockerfile or any static host. No build command or server-side environment variables are required.
