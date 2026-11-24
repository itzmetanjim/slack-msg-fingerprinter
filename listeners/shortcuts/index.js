import { sampleShortcutCallback, shortcutTwoCallback } from './sample-shortcut.js';

export const register = (app) => {
  app.shortcut('sample_shortcut_id', sampleShortcutCallback);
  app.shortcut('shortcut_two_id', shortcutTwoCallback);
};
