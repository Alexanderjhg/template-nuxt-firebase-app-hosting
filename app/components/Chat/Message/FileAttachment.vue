<template>
  <div class="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 max-w-sm">
    <!-- Ícono según tipo -->
    <div class="flex-shrink-0 w-9 h-9 rounded-md bg-white/10 flex items-center justify-center text-lg">
      {{ fileIcon }}
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm text-white truncate">{{ attachment.fileName }}</p>
      <p class="text-xs text-white/40">{{ formattedSize }}</p>
    </div>
    <a
      :href="attachment.fileUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="flex-shrink-0 p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
      title="Descargar"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </a>
  </div>
</template>

<script setup lang="ts">
import type { MessageAttachment } from "~/types/chat";

const props = defineProps<{ attachment: MessageAttachment }>();

const fileIcon = computed(() => {
  const type = props.attachment.mimeType;
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📄";
  if (type.includes("zip") || type.includes("tar")) return "🗜️";
  if (type.includes("spreadsheet") || type.includes("excel")) return "📊";
  if (type.includes("document") || type.includes("word")) return "📝";
  return "📎";
});

const formattedSize = computed(() => {
  const bytes = props.attachment.fileSize;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
});
</script>
