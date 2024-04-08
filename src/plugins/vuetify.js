// src/plugins/vuetify.js

// Import the necessary Vuetify parts
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

// Import the Vuetify stylesheet
import "vuetify/styles";

// Create the Vuetify instance with components and directives you plan to use
const vuetify = createVuetify({
  components,
  directives,
});

// Export the Vuetify instance
export default vuetify;
