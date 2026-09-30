# Store setup checklist (App Store + Google Play)

Everything that can be done in code is done. What is left needs your accounts and
credentials. Nothing below should be committed to git: keys go in EAS environment
variables (Expo dashboard → the project → Environment variables) or Railway variables.

App identity (both stores): `com.aleveatelier.hyvo` · version `1.0.0` (build numbers are
handled by EAS) · support URL `/support` · privacy `/privacy` · terms `/terms` · delete-account
page `/delete-account`, all on `https://hybrid-production-29ef.up.railway.app`.

## 1. Google account and Play Console
- [ ] Sign up for Google Play Console (one-time $25 fee) with the new Google account.
- [ ] Create the app: name Hyvo, package `com.aleveatelier.hyvo`, free app (subscriptions are separate).
- [ ] New personal accounts may have to run a closed test with a minimum number of testers for
      about 14 days before production access. Check the current rule in the Play Console.
- [ ] Turn on Play App Signing (default). Note the **SHA-1 of the app signing key** it shows you.

## 2. Google Cloud project (same Google account)
- [ ] Create a project. Configure the **OAuth consent screen** (app name Hyvo, support email,
      privacy policy link, terms link).
- [ ] **Web client ID** (OAuth client type "Web application") →
  - EAS variable `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
  - Railway variables `GOOGLE_CLIENT_ID_WEB` and `GOOGLE_CLIENT_SECRET`
- [ ] **Android client ID** (type "Android"), package `com.aleveatelier.hyvo`, and add **both**
      SHA-1 fingerprints: the EAS keystore (`eas credentials` → Android → keystore) and the Play
      App Signing key. Railway variable `GOOGLE_CLIENT_ID_ANDROID`. Nothing goes in the app for this.
- [ ] **iOS client ID** (type "iOS"), bundle `com.aleveatelier.hyvo` →
  - EAS variable `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
  - Railway variable `GOOGLE_CLIENT_ID_IOS`
- [ ] Enable **Maps SDK for Android**, create an API key, restrict it to Android apps with package
      `com.aleveatelier.hyvo` + the SHA-1s above, and set EAS variable `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY`.
      Until it is set, Android shows the route as a drawing instead of a map (it never crashes).
- [ ] The Maps key that used to be in `app.json` belongs to the old project and is still in git
      history. Delete or restrict that key in its Google Cloud project.

## 3. Play Console forms (App content)
- [ ] Privacy policy URL (above).
- [ ] **Data safety** (answers match what the app really does):
  - Collected: name, email address, user ID (account); photos (profile picture, optional);
    fitness info (logged workouts, runs); precise location (run routes, only while a run is being
    recorded); purchase history (subscription status, via RevenueCat).
  - Health Connect data (steps, active energy, heart rate, sleep) is read on the device only and is
    **not** collected or uploaded.
  - Not sold, not used for advertising. Encrypted in transit: yes. Users can request deletion: yes
    (in the app under Profile → Privacy & Data, and at `/delete-account`).
- [ ] **Health apps declaration** (Health Connect). Reason for each permission: shows the person's own
      steps, active energy, resting heart rate and sleep in their overview and on workout summaries.
      Read only; no writing; no sharing.
- [ ] **Background location** declaration. Feature: recording a run's route, distance and pace while the
      phone is locked or Hyvo is in the background, only after the person starts a run. Play may ask for
      a short screen recording showing the run being started and the in-app disclosure.
- [ ] **Foreground service (location)** declaration: same feature, with the ongoing notification.
- [ ] Content rating questionnaire, target audience (16+), ads: none, government/news/finance: no.
- [ ] Store listing: short and full description, 512×512 icon, 1024×500 feature graphic, phone screenshots.

## 4. First Android build and upload
```
eas build --platform android --profile preview      # installable .apk for testing
eas build --platform android --profile production   # .aab for Google Play
```
The very first upload to Google Play must be done by hand in the Play Console (upload the `.aab`
to an Internal testing release). After that, `eas submit --platform android` works once you add a
Google service account key at `hybrid-zone-app/google-service-account.json` (already git-ignored):
Play Console → Setup → API access.

## 5. Subscriptions (both stores)
- [ ] Apple: create the subscription group and products in App Store Connect (see earlier notes).
- [ ] Google: create the same subscription in Play Console → Monetize → Subscriptions.
- [ ] RevenueCat: add the Android app (package `com.aleveatelier.hyvo`) with a Google service account,
      attach the products to the `hyvo_pro` entitlement, build the paywall.
- [ ] EAS variables `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_…`) and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_…`).
- [ ] Decide what Hyvo Pro unlocks: today it gates nothing, so a store review of a paid app could fail.

## 6. Apple leftovers
- [ ] Sign in with Apple token revocation on account deletion (needs a Sign in with Apple key). Listed in the API README.
- [ ] Railway variable `APPLE_BUNDLE_IDENTIFIER=com.aleveatelier.hyvo`.
- [ ] Production build → TestFlight → submit for review (`eas build --profile production --platform ios`, `eas submit`).

## 7. Both stores
- [ ] Have the Terms and Privacy pages reviewed by a lawyer, and add your registered business name and address if required.
- [ ] Deploy the API (push to GitHub) so the legal, support and delete pages are live.
