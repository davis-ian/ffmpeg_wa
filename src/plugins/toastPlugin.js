import { toast } from "vue3-toastify";
import "vue3-toastify/dist/index.css";

export default {
  install: (app, userOptions = {}) => {
    const customToast = (message, options = {}) => {
      const finalOptions = { ...userOptions, ...options };
      return toast(message, finalOptions);
    };

    app.config.globalProperties.$toast = customToast;
  },
};
