import type { App } from "vue";

import Button from "./button.vue";

Button.install = (app: App) => {
  Button.name && app.component(Button.name, Button);
};

export { Button };
