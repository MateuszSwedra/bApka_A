const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

/** Notifee full-screen intent: https://notifee.app/react-native/docs/android/behaviour#full-screen */
function withSosFullScreenActivity(config) {
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    const activities = app?.activity;
    if (!Array.isArray(activities)) return cfg;

    const main = activities.find((a) => a.$?.['android:name'] === '.MainActivity');
    if (main?.$) {
      main.$['android:showWhenLocked'] = 'true';
      main.$['android:turnScreenOn'] = 'true';
    }
    return cfg;
  });

  config = withMainActivity(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (!contents.includes('import android.view.WindowManager')) {
      contents = contents.replace(
        'import android.os.Bundle',
        'import android.os.Bundle\nimport android.view.WindowManager',
      );
    }

    const merged = mergeContents({
      src: contents,
      newSrc: `    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }`,
      tag: 'sos-full-screen-intent',
      anchor: /super\.onCreate\(null\)/,
      offset: 1,
      comment: '//',
    });

    if (merged.didMerge || merged.didClear) {
      cfg.modResults.contents = merged.contents;
    }
    return cfg;
  });

  return config;
}

module.exports = withSosFullScreenActivity;
