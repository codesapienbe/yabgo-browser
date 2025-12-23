# Android build (Capacitor) ⚙️

This document explains how to package the YABGO Browser web renderer into an Android APK using Capacitor and how to prepare the repository for F‑Droid.

## Quick steps

1. Build web assets

```bash
npm run build
```

2. Initialize Capacitor (first time only)

```bash
npm run cap:init
```

3. Add Android platform (first time only)

```bash
npm run cap:add:android
```

4. Copy web assets and sync native plugins

```bash
npm run cap:copy
npm run cap:sync
```

5. Open Android Studio to build

```bash
npm run cap:open:android
# then use Android Studio or: ./gradlew assembleRelease
```

6. (Optional) Generate a release APK

Open Android Studio, create a release build, sign it with your key.

---

## Important notes & F‑Droid guidance ⚠️

- F‑Droid builds from source. Make sure the repository contains the complete Android `android/` folder and a reproducible Gradle build. F‑Droid will build the app itself, so the repo must include everything needed to build.
- **Avoid proprietary SDKs** (Google Play Services, closed-source analytics). These may prevent acceptance in F‑Droid.
- If your app needs native features (previously implemented in the Electron main process or using Node-only modules), port them to Capacitor plugins or native Android code. Node/Electron main process code will not run inside Android WebView.
- Use a permissive license (this repo uses MIT), and include clear build instructions (see `fdroid.yml` and this document).

---

## Troubleshooting & tips 💡

- If `npx cap add android` fails, ensure you have Android SDK, Java (JDK 17+), and Gradle installed.
- To keep a reproducible build for F‑Droid, prefer pinned dependency versions and include any local plugin code in the repo.
- For a full offline APK, ensure `dist/` assets are copied into `android/app/src/main/assets/public` via Capacitor copy (this is the default behavior for `webDir` set to `dist`).

---

## Reproducible / distro-style builds 🛠️

To make the project buildable by distro build systems (F‑Droid or Linux distribution builders) you should ensure the full *source* build can be run from the repository with a single, repeatable command. Recommended additions included in this repo:

- A helper script: `scripts/prepare-android-build.sh` that runs `npm ci`, `npm run build`, and `npx cap copy`/`npx cap sync` so the `android/` sources contain the up-to-date web assets.
- Add a Gradle task (in `android/app/build.gradle`) that runs the web build automatically when Gradle's `preBuild` runs — this lets the distro builder run `./gradlew assembleRelease` and get a complete build.

Example Gradle snippet to add to `android/app/build.gradle` (module-level, inside `android { ... }` or at top-level):

```groovy
// Run npm build automatically before preBuild
task generateWebAssets(type: Exec) {
    workingDir = rootProject.projectDir
    // Use a single-line shell so distro builders that run on Linux will execute correctly
    commandLine 'bash', '-lc', 'npm ci && npm run build'
}
preBuild.dependsOn generateWebAssets
```

Notes:
- If you add the Gradle task, make sure build systems have Node and npm available (F‑Droid builders do allow network & package installs, but pinning versions and `package-lock.json` improves reproducibility).
- Commit the generated `android/` folder (or ensure your fdroiddata references a build step that runs `scripts/prepare-android-build.sh`) so F‑Droid or distro teams can reproduce your release.

---

If you want, I can add the Gradle snippet into `android/` automatically — but I need the `android/` project present (it must be added locally or generated on a machine with Android tooling). I can also add a short `fdroiddata`-style note to `fdroid.yml` showing the necessary build commands.

If you'd like, I can add Gradle & Node caching to the GitHub Actions workflow (speeds CI and makes it behave more like distro builders).

---

## CI: GitHub Actions (Automated APK build)

You can fully automate building (and optionally signing) an Android APK using GitHub Actions. Below are the core steps, required secrets, and a sample workflow that you can drop in `.github/workflows/build-android.yml`.

### What the workflow does
- Builds web assets (`npm run build`) producing `dist/`
- Ensures the Capacitor Android platform exists (runs `npx cap add android` when necessary)
- Copies the `dist/` web assets into the Android project (`npx cap copy && npx cap sync`)
- Installs JDK and Android SDK (platform-tools, build-tools, platforms)
- Runs Gradle to build a release APK (`./gradlew assembleRelease`)
- Optionally prepares signing using GitHub Secrets and uploads the signed APK as a workflow artifact or release asset

### Required GitHub Secrets
- `KEYSTORE_BASE64` — Base64-encoded keystore file
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`
- `GITHUB_TOKEN` (provided by GitHub for releases; available by default)

> Tip: Create a release keystore locally with `keytool -genkeypair -v -keystore release.keystore -alias yabgo -keyalg RSA -keysize 2048 -validity 10000`, then base64 it and copy into `KEYSTORE_BASE64`.

Local helper scripts

- Encode keystore as a single-line base64 and copy to clipboard (macOS & Linux friendly):

```bash
# prints & copies to clipboard (if available)
npm run keystore:encode
# or invoke directly
bash ./scripts/encode-keystore.sh release.keystore --copy
```

- Create `android/keystore.properties` locally from env or interactive prompts (do NOT commit):

```bash
npm run keystore:props
# or non-interactive using env vars
KEYSTORE_PASSWORD=... KEY_ALIAS=... KEY_PASSWORD=... npm run keystore:props
```

Security note

- **Do NOT commit** the keystore or `android/keystore.properties` to your repository. This project already ignores `release.keystore` and `android/keystores/` via `.gitignore`.
- For CI, paste the base64 into `KEYSTORE_BASE64` secret and set the other secrets; the workflow decodes the keystore at build time and uses the secret values only during the run.

### Example workflow
See `.github/workflows/build-android.yml` in this repo. It runs on tag pushes (`v*`) and can be triggered manually (workflow_dispatch).

### F‑Droid note
- F‑Droid builds apps from source and will require the entire Gradle project (`android/`) to be present in the repo or reachable by the build process. For F‑Droid inclusion you should commit the `android/` folder to the repository (run `npm run cap:add:android` locally and commit the generated files) and keep builds reproducible (pinned dependency versions, avoid closed-source SDKs).

---

If you want, I can add the workflow file and update docs (done), and if you prefer I can also add a GitHub Actions `workflow_dispatch` helper that can regenerate `android/` via Capacitor on the runner (already in the supplied workflow) or add a sample `keystore.properties` loader snippet to `android/app/build.gradle`. Tell me if you'd like me to add the latter.

