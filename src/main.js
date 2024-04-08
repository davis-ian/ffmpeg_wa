import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

import vuetify from "./plugins/vuetify";
import toastPlugin from "./plugins/toastPlugin";

const app = createApp(App);
// Use Vuetify
app.use(vuetify);
app.use(toastPlugin, {
  autoClose: 2000,
});

app.mount("#app");
