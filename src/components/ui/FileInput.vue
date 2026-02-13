<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits(["change"]);
const props = withDefaults(
  defineProps<{
    id?: string;
    accept?: string;
    disabled?: boolean;
    multiple?: boolean;
  }>(),
  {
    id: undefined,
    accept: "*/*",
    disabled: false,
    multiple: false,
  },
);
const fileInput = ref<HTMLInputElement | null>(null);

function handleChange(event: Event) {
  emit("change", event);
}

function clear() {
  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

defineExpose({ clear });
</script>

<template>
  <div class="file-input-wrapper">
    <input
      :id="props.id"
      type="file"
      @change="handleChange"
      ref="fileInput"
      :accept="props.accept"
      :disabled="props.disabled"
      :multiple="props.multiple"
    />
  </div>
</template>

<style scoped>
/* File Input Styling */
.file-input-wrapper {
  display: flex;
  justify-content: center;
  margin: var(--space-sm) 0;
}

.file-input-wrapper input[type="file"] {
  font-family: var(--font-family);
  padding: var(--space-sm);
  border: 1px dashed var(--text-pop);
  border-radius: 0;
  background-color: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  width: 100%;
  max-width: 100%;
  text-align: center;
}

.file-input-wrapper input[type="file"]:hover {
  border-color: var(--accent);
  background-color: var(--bg-surface);
  color: var(--text-pop);
}
</style>
