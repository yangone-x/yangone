import type { App, Plugin } from 'vue';

import * as components from './components';
import version from './version';

export * from './components';

let prefix = 'Y';

export function setPrefix(newPrefix: string) {
  prefix = newPrefix;
}

export function install(app: App) {
  app.config.globalProperties._ant_prefix = prefix;
  Object.keys(components).forEach((key) => {
    const component = (components as any)[key];
    if ('install' in component) {
      app.use(component);
    }
  });
}

// The default export doubles as a Vue plugin. `install` and `setPrefix` are also
// exposed as named exports so the UMD/ESM globals (`window.antd`) carry `install`
// directly, letting `app.use(window.antd)` work without reaching for `.default`.
export default {
  setPrefix,
  install,
  version,
} as Plugin;

export { version };
