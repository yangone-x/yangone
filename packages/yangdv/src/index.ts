import type { App, Plugin } from 'vue';

import * as components from './components';
import { globalNamespace } from './hooks/use-namespace';

import './styles/index.scss';

export * from './components';

export function setPrefix(newPrefix: string) {
  globalNamespace.value = newPrefix;
}

export function install(app: App) {
  Object.keys(components).forEach((key) => {
    const component = (components as any)[key];
    if ('install' in component) {
      app.use(component);
    }
  });
}

// The default export doubles as a Vue plugin. `install` and `setPrefix` are also
// exposed as named exports so the UMD/ESM globals (`window.yangdv`) carry `install`
// directly, letting `app.use(window.yangdv)` work without reaching for `.default`.
export default {
  setPrefix,
  install,
} as Plugin;
