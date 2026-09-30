// Adds the values that must not live in app.json. app.json is passed in as `config`.
//
// EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY: the Google Maps SDK key for Android
// (Google Cloud → APIs & Services → Credentials, restricted to this app's
// package name and signing-key SHA-1). The same variable is read at runtime, so
// the app shows a plain route drawing instead of a map when it isn't set.
module.exports = ({ config }) => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY;
  if (!mapsKey) return config;
  return {
    ...config,
    android: {
      ...config.android,
      config: { ...(config.android && config.android.config), googleMaps: { apiKey: mapsKey } },
    },
  };
};
