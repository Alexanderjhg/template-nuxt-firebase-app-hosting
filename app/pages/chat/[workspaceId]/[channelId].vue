<template>
  <div class="flex h-full bg-[#0a0a0f] overflow-hidden">
    <!-- Sidebar -->
    <ChatLayoutSidebar
      :workspace-name="activeWorkspace?.name"
      :workspace-id="workspaceId"
      :active-channel-id="isDMView ? undefined : channelId"
      :active-d-m-id="isDMView ? channelId : undefined"
      :active-page="activePage"
      :pending-count="pendingCount"
      @select-channel="navigateTo(`/chat/${workspaceId}/${$event}`)"
      @select-d-m="navigateTo(`/chat/${workspaceId}/dm/${$event}`)"
      @select-pending="activePage = 'pending'"
      @open-create-channel="showCreateChannel = true"
      @open-new-d-m="showNewDM = true"
      @open-settings="navigateTo(`/chat/${workspaceId}/settings/general`)"
    />

    <!-- Main content -->
    <div class="flex flex-1 flex-col min-w-0">
      <!-- Pending tasks view -->
      <div v-if="activePage === 'pending'" class="flex-1 overflow-y-auto">
        <ChatPendingTasksPanel :workspace-id="workspaceId" @close="activePage = ''" />
      </div>

      <!-- Chat view -->
      <template v-else>
        <!-- Channel header -->
        <div class="border-b border-white/5 flex-shrink-0">
          <div class="flex items-center justify-between px-4 py-3">
            <div class="min-w-0 flex-1">
              <h2 class="text-sm font-semibold text-white">{{ channelHeader }}</h2>
              <p
                v-if="channelDescription"
                class="text-xs text-white/40 truncate cursor-pointer hover:text-white/60 transition-colors"
                :title="channelDescription"
                @click="currentChannel?.type === 'agent' ? navigateTo(`/chat/${workspaceId}/settings/agents`) : undefined"
              >
                {{ channelDescription }}
              </p>
            </div>
            <!-- Badge de tareas pendientes -->
            <button
              v-if="pendingCount > 0"
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 transition-colors"
              @click="activePage = 'pending'"
            >
              <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span class="text-xs text-emerald-400 font-medium">{{ pendingCount }}</span>
            </button>
            <!-- Botón de miembros (solo canales privados) -->
            <button
              v-if="currentChannel?.isPrivate && !isDMView"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors text-xs"
              @click="openMembersModal"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{{ channelMemberCount }}</span>
            </button>
          </div>

          <!-- Barra de mensajes fijados (Pins) -->
          <div
            v-if="pinnedMessages.length > 0 && !isDMView"
            class="px-4 pb-2 space-y-1"
          >
            <button
              class="w-full flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors"
              @click="showPins = !showPins"
            >
              <svg class="w-3 h-3 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>{{ pinnedMessages.length }} mensaje{{ pinnedMessages.length > 1 ? 's' : '' }} fijado{{ pinnedMessages.length > 1 ? 's' : '' }}</span>
              <svg class="w-3 h-3 ml-auto transition-transform" :class="showPins ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              leave-active-class="transition-all duration-150 ease-in"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div v-if="showPins" class="space-y-1 pl-5">
                <div
                  v-for="pin in pinnedMessages"
                  :key="pin.messageId"
                  class="group flex items-start gap-2 rounded-md bg-yellow-500/5 border border-yellow-500/10 px-3 py-1.5"
                >
                  <div class="flex-1 min-w-0">
                    <span class="text-[10px] text-yellow-500/70 font-medium">{{ pin.senderName }}</span>
                    <p class="text-xs text-white/60 truncate">{{ pin.content }}</p>
                  </div>
                  <button
                    v-if="isMemberAdmin"
                    class="flex-shrink-0 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Desfijar"
                    @click="unpinMessage(pin.messageId)"
                  >
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- Messages list -->
        <div
          ref="scrollContainer"
          class="flex-1 overflow-y-auto py-4 space-y-0.5"
        >
          <!-- Messages -->
          <ChatMessageBubble
            v-for="msg in combinedMessages"
            :key="msg.id"
            :message="msg"
            :is-own="msg.senderId === user?.uid"
            :is-admin="isMemberAdmin"
            :is-pinned="pinnedMessages.some(p => p.messageId === msg.id)"
            :can-pin="!isDMView && msg.type === 'text'"
            :suggestion="suggestionByMessageId[msg.id]"
            :responded-suggestion="respondedByMessageId[msg.id]"
            :observer-mode="observerMode"
            @react="(emoji) => toggleReaction(msg.id, emoji)"
            @edit="startEdit(msg)"
            @delete="deleteMessage(msg.id)"
            @pin="handlePinMessage"
            @reply="startReply(msg)"
            @action-click="(btn) => handleBubbleAction(msg, btn)"
            @suggestion-action="(data) => handleSuggestionAction(data)"
            @observe-manual="(msgId) => handleObserveManual(msgId)"
          />

          <div ref="bottomAnchor" />
        </div>

        <!-- Message input con suggestion tray integrado -->
        <ChatMessageInput
          :workspace-id="workspaceId"
          :channel-id="channelId"
          :placeholder="inputPlaceholder"
          :editing-content="editingMessage?.content"
          :replying-to="replyingTo"
          :is-d-m="isDMView"
          :members="workspaceMembers"
          @send="handleSend"
          @cancel-edit="cancelEdit"
          @cancel-reply="replyingTo = null"
          @typing="handleTyping"
          @command="handleSlashCommand"
        >
        </ChatMessageInput>
      </template>
    </div>

    <!-- Modal: Slash Commands -->
    <Teleport to="body">
      <div v-if="activeCommand" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click.self="closeCommand">
        <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f1a] overflow-hidden shadow-2xl">

          <!-- /quienes -->
          <template v-if="activeCommand === 'quienes'">
            <div class="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 class="text-sm font-semibold text-white">👥 Miembros del workspace</h3>
              <button class="text-white/30 hover:text-white" @click="closeCommand"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div class="p-4 space-y-1 max-h-80 overflow-y-auto">
              <div v-for="m in workspaceMembers" :key="m.uid" class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5">
                <div class="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0 relative">
                  <img v-if="m.photoURL" :src="m.photoURL" class="w-full h-full object-cover" />
                  <span v-else>{{ m.displayName?.[0]?.toUpperCase() }}</span>
                  <ChatPresenceDot :status="getStatus(m.uid)" class="absolute -bottom-0.5 -right-0.5 ring-1 ring-[#0f0f1a]" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <p class="text-sm text-white truncate">{{ m.displayName }}</p>
                    <span v-if="m.username" class="text-xs text-white/30 truncate">@{{ m.username }}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5">
                    <p v-if="m.workspaceRole" class="text-xs text-violet-400 truncate">{{ m.workspaceRole }}</p>
                    <p v-else class="text-xs text-white/20 truncate">{{ m.role }}</p>
                    <span v-if="m.workspaceStatus" class="text-xs text-white/30">· {{ workspaceStatusLabel(m.workspaceStatus) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- /workflow -->
          <template v-else-if="activeCommand === 'workflow'">
            <div class="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 class="text-sm font-semibold text-white">⚙️ Workspace</h3>
              <button class="text-white/30 hover:text-white" @click="closeCommand"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div class="p-5 space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-violet-600 flex items-center justify-center text-lg font-bold text-white">{{ activeWorkspace?.name?.[0]?.toUpperCase() }}</div>
                <div>
                  <p class="text-sm font-semibold text-white">{{ activeWorkspace?.name }}</p>
                  <p class="text-xs text-white/40">Plan: {{ activeWorkspace?.plan }}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg bg-white/5 px-3 py-2">
                  <p class="text-white/40">Canales</p>
                  <p class="text-white font-medium">{{ channels.length }}</p>
                </div>
                <div class="rounded-lg bg-white/5 px-3 py-2">
                  <p class="text-white/40">Miembros</p>
                  <p class="text-white font-medium">{{ workspaceMembers.length }}</p>
                </div>
              </div>
            </div>
          </template>

          <!-- /recordar -->
          <template v-else-if="activeCommand === 'recordar'">
            <div class="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 class="text-sm font-semibold text-white">⏰ Crear recordatorio</h3>
              <button class="text-white/30 hover:text-white" @click="closeCommand"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div class="p-5 space-y-3">
              <p class="text-xs text-white/40">Usa el asistente IA para crear recordatorios o automatizaciones enviando un mensaje con <span class="text-violet-400">/recordar [descripción] a las [hora]</span> en el DM Personal.</p>
              <button class="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-colors" @click="closeCommand; navigateTo(`/chat/${workspaceId}/settings/automations`)">
                Ver automatizaciones
              </button>
            </div>
          </template>

          <!-- /resumir -->
          <template v-else-if="activeCommand === 'resumir'">
            <div class="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 class="text-sm font-semibold text-white">📝 Resumen del canal</h3>
              <button class="text-white/30 hover:text-white" @click="closeCommand"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div class="p-5 space-y-3">
              <p class="text-xs text-white/40">El asistente IA resumirá los últimos 20 mensajes de este canal.</p>
              <button
                class="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-colors"
                @click="handleResumeCommand"
              >
                Resumir ahora
              </button>
            </div>
          </template>

          <!-- /estado -->
          <template v-else-if="activeCommand === 'estado'">
            <div class="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 class="text-sm font-semibold text-white">💬 Mi estado</h3>
              <button class="text-white/30 hover:text-white" @click="closeCommand"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div class="p-4 space-y-2">
              <p class="text-xs text-white/30 px-1 mb-3">Selecciona tu estado actual en este workspace</p>
              <button
                v-for="opt in workspaceStatusOptions"
                :key="opt.value"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors"
                :class="myWorkspaceStatus === opt.value
                  ? 'border-violet-500/50 bg-violet-500/10 text-white'
                  : 'border-white/5 bg-white/[0.02] text-white/60 hover:border-white/15 hover:text-white/90'"
                :disabled="savingStatus"
                @click="handleStatusChange(opt.value)"
              >
                <span class="text-base w-6 text-center flex-shrink-0">{{ opt.icon }}</span>
                <span>{{ opt.label }}</span>
                <svg v-if="myWorkspaceStatus === opt.value" class="ml-auto w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              </button>
            </div>
          </template>

          <!-- /activos -->
          <template v-else-if="activeCommand === 'activos'">
            <div class="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 class="text-sm font-semibold text-white">🟢 Disponibles ahora</h3>
              <button class="text-white/30 hover:text-white" @click="closeCommand"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div class="p-4 space-y-1 max-h-72 overflow-y-auto">
              <template v-if="availableMembers.length > 0">
                <div v-for="m in availableMembers" :key="m.uid" class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5">
                  <div class="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0">
                    <img v-if="m.photoURL" :src="m.photoURL" class="w-full h-full object-cover" />
                    <span v-else>{{ m.displayName?.[0]?.toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white truncate">{{ m.displayName }}</p>
                    <p class="text-xs text-white/30 truncate">{{ m.workspaceRole || m.role }}</p>
                  </div>
                  <span class="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex-shrink-0">{{ workspaceStatusLabel(m.workspaceStatus!) }}</span>
                </div>
              </template>
              <p v-else class="text-sm text-white/30 text-center py-6">Nadie tiene estado "Disponible" ahora</p>
            </div>
          </template>

        </div>
      </div>
    </Teleport>

    <!-- Modals -->
    <div v-if="showCreateChannel" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 space-y-4">
        <h3 class="text-lg font-semibold text-white">Nuevo canal</h3>
        <input
          v-model="newChannelName"
          type="text"
          placeholder="nombre-del-canal"
          class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-violet-500/50 focus:outline-none"
        />
        <label class="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
          <input v-model="newChannelPrivate" type="checkbox" class="accent-violet-500" />
          Canal privado
        </label>
        <div class="flex gap-2 justify-end">
          <button class="px-4 py-2 text-sm text-white/50 hover:text-white" @click="showCreateChannel = false">Cancelar</button>
          <UIButton @click="createChannel">Crear</UIButton>
        </div>
      </div>
    </div>

    <!-- Modal selector de contacto (cuando hay múltiples coincidencias) -->
    <Teleport to="body">
      <div v-if="showContactPicker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] p-5 space-y-4">
          <h3 class="text-sm font-semibold text-white">Selecciona el contacto correcto</h3>
          <p class="text-xs text-white/40">Se encontraron varias coincidencias:</p>

          <div class="space-y-1 max-h-60 overflow-y-auto">
            <button
              v-for="match in contactMatches"
              :key="match.uid"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
              @click="selectContactAndSend(match)"
            >
              <img
                v-if="match.photoURL"
                :src="match.photoURL"
                class="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div v-else class="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                {{ match.displayName?.[0]?.toUpperCase() ?? '?' }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white truncate">{{ match.displayName }}</p>
                <p v-if="match.username" class="text-xs text-white/30 truncate">@{{ match.username }}</p>
              </div>
              <span class="text-xs text-white/20 flex-shrink-0">{{ match.source === 'member' ? 'Miembro' : 'Contacto' }}</span>
            </button>
          </div>

          <button
            class="w-full py-2 text-sm text-white/40 hover:text-white transition-colors"
            @click="showContactPicker = false"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Modal selector de hora personalizada -->
    <Teleport to="body">
      <div v-if="showTimePicker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-xs rounded-2xl border border-white/10 bg-[#0f0f1a] p-5 space-y-4">
          <h3 class="text-sm font-semibold text-white">Selecciona la hora</h3>
          <p class="text-xs text-white/40">{{ pendingCalendarSug?.button?.payload?.title ?? 'Evento' }} — {{ pendingCalendarSug?.button?.payload?.date ?? '' }}</p>
          <input
            v-model="customTime"
            type="time"
            class="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50"
          />
          <div class="flex gap-2">
            <button
              class="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-colors disabled:opacity-40"
              :disabled="!customTime"
              @click="confirmCustomTime"
            >
              Agendar
            </button>
            <button
              class="flex-1 py-2 rounded-lg border border-white/10 text-sm text-white/40 hover:text-white transition-colors"
              @click="showTimePicker = false; pendingCalendarSug = null; customTime = '';"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: nuevo mensaje directo -->
    <Teleport to="body">
      <div v-if="showNewDM" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f1a] p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-white">Nuevo mensaje directo</h3>
            <button class="text-white/30 hover:text-white transition-colors" @click="showNewDM = false; dmSearch = ''">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <input
            v-model="dmSearch"
            type="text"
            placeholder="Buscar miembro..."
            class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
            autofocus
          />

          <div class="space-y-1 max-h-64 overflow-y-auto">
            <p v-if="filteredDMMembers.length === 0" class="text-xs text-white/30 text-center py-4">
              {{ dmSearch ? 'Sin resultados' : 'No hay otros miembros' }}
            </p>
            <button
              v-for="m in filteredDMMembers"
              :key="m.uid"
              :disabled="startingDM"
              class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left disabled:opacity-40"
              @click="startDM(m.uid)"
            >
              <div class="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-xs text-white font-bold flex-shrink-0 overflow-hidden">
                <img v-if="m.photoURL" :src="m.photoURL" class="w-full h-full object-cover" alt="" />
                <span v-else>{{ m.displayName?.[0]?.toUpperCase() ?? '?' }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white truncate">{{ m.displayName }}</p>
                <p v-if="m.workspaceRole" class="text-xs text-white/30 truncate">{{ m.workspaceRole }}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal de miembros del canal privado -->
    <Teleport to="body">
      <div v-if="showChannelMembers" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] p-5 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-white">Miembros del canal</h3>
            <span class="text-xs text-white/30">{{ channelMembers.length }} miembro{{ channelMembers.length !== 1 ? 's' : '' }}</span>
          </div>

          <!-- Agregar miembros -->
          <div v-if="canManageChannelMembers" class="space-y-2">
            <p class="text-xs text-white/40">Agregar miembros del workspace:</p>
            <div class="flex gap-2">
              <select
                v-model="selectedMemberToAdd"
                class="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
              >
                <option value="" disabled class="bg-[#0f0f1a]">Seleccionar miembro...</option>
                <option
                  v-for="m in availableMembersToAdd"
                  :key="m.uid"
                  :value="m.uid"
                  class="bg-[#0f0f1a]"
                >
                  {{ m.displayName }}
                </option>
              </select>
              <button
                :disabled="!selectedMemberToAdd || addingMember"
                class="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-sm text-white font-medium transition-colors"
                @click="addMemberToChannel"
              >
                {{ addingMember ? '...' : 'Agregar' }}
              </button>
            </div>
          </div>

          <!-- Lista de miembros actuales -->
          <div class="space-y-1 max-h-60 overflow-y-auto">
            <div
              v-for="m in channelMembers"
              :key="m.uid"
              class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div class="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-xs text-white font-bold flex-shrink-0 overflow-hidden">
                <img v-if="m.photoURL" :src="m.photoURL" class="w-full h-full object-cover" alt="" />
                <span v-else>{{ m.displayName?.[0]?.toUpperCase() ?? '?' }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white truncate">{{ m.displayName }}</p>
                <p class="text-xs text-white/30">{{ m.role }}</p>
              </div>
              <button
                v-if="canManageChannelMembers && m.uid !== currentChannel?.createdBy"
                class="p-1 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                title="Quitar del canal"
                @click="removeMemberFromChannel(m.uid)"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span v-else-if="m.uid === currentChannel?.createdBy" class="text-[10px] text-white/20">Creador</span>
            </div>
          </div>

          <button
            class="w-full py-2 text-sm text-white/40 hover:text-white transition-colors"
            @click="showChannelMembers = false"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Message, ActionButton } from "~/types/chat";

definePageMeta({ middleware: "auth", layout: "app" });

const route = useRoute();
const workspaceId = computed(() => route.params.workspaceId as string);
const channelId = computed(() => route.params.channelId as string);
const isDMView = computed(() => route.path.includes("/dm/"));

const activePage = ref(route.query.view === "pending" ? "pending" : "");
const showCreateChannel = ref(false);
const newChannelName = ref("");
const newChannelPrivate = ref(false);
const showNewDM = ref(false);
const showChannelMembers = ref(false);
const showPins = ref(false);
const channelMembers = ref<Array<{ uid: string; displayName: string; photoURL: string; role: string }>>([]);
const selectedMemberToAdd = ref("");
const addingMember = ref(false);

const scrollContainer = ref<HTMLElement | null>(null);
const bottomAnchor = ref<HTMLElement | null>(null);
const editingMessage = ref<Message | null>(null);
const replyingTo = ref<Message | null>(null);
const isMemberAdmin = ref(false);
const workspaceMembers = ref<Array<{ uid: string; displayName: string; photoURL?: string; username?: string; role?: string; workspaceRole?: string; workspaceStatus?: string }>>([]);
const myPermissions = ref<Record<string, boolean | undefined>>({});

const { user, getIdToken } = useAuth();
const { activeWorkspace, loadUserWorkspaces, listenWorkspace, setActiveWorkspace, workspacesMap } = useWorkspace();
const { listenChannels, channels, createChannel: doCreateChannel } = useChannels();
const { markRead } = useChannelPrefs();
const { listenMessages, loadMore, getMessages, hasMore, loadingMore, sendMessage, editMessage, deleteMessage: doDelete, toggleReaction: doReact } = useMessages();
const { listenDMs, aiDM, regularDMs } = useDMs();
const { startHeartbeat, stopHeartbeat, setTypingIn, getStatus } = usePresence();
const { agents, listenAgents, stopListening: stopListeningAgents } = useAgents();

// IA y pendientes
const { observe: aiObserve, observeManual: aiObserveManual, stop: aiStop, getMode: getObserverMode } = useAiObserver();
const {
  listenSuggestions, stopListening: stopSuggestions,
  suggestionByMessageId, respondedByMessageId, acceptSuggestion, dismissSuggestion
} = useSuggestions();

const { 
  listenTasks, stopListening: stopTasks, pendingCount, addTask 
} = usePendingTasks();

const messages = computed(() => getMessages(channelId.value));
const hasMoreMessages = computed(() => hasMore.value[channelId.value] ?? false);
const isLoadingMore = computed(() => loadingMore.value[channelId.value] ?? false);

const combinedMessages = computed(() => {
  return [...messages.value].sort((a, b) => {
    const timeA = (a.createdAt as any)?.toDate?.()?.getTime() ?? 0;
    const timeB = (b.createdAt as any)?.toDate?.()?.getTime() ?? 0;
    return timeA - timeB;
  });
});

const observerMode = computed(() => getObserverMode());

// Permisos del miembro: admin → individual → global
function hasPerm(key: string): boolean {
  if (isMemberAdmin.value) return true;
  const individual = myPermissions.value[key];
  if (individual !== undefined) return individual;
  return (activeWorkspace.value?.settings?.memberPermissions as Record<string, boolean> | undefined)?.[key] === true;
}
const canCreateChannels = computed(() => hasPerm("canCreateChannels"));
const canInviteMembers = computed(() => hasPerm("canInviteMembers"));

const currentChannel = computed(() =>
  channels.value.find((c) => c.id === channelId.value)
);

const pinnedMessages = computed(() => currentChannel.value?.pinnedMessages ?? []);

const channelHeader = computed(() => {
  if (isDMView.value) {
    const dm = regularDMs.value.find((d) => d.id === channelId.value)
      ?? aiDM.value;
    if (!dm) return "Mensaje directo";
    if (dm.isAiDM) return "🤖 Asistente IA";
    const otherId = dm.participantIds.find((id) => id !== user.value?.uid);
    return otherId ? dm.participantMap[otherId]?.displayName ?? "DM" : "DM";
  }
  return currentChannel.value ? `# ${currentChannel.value.name}` : "Canal";
});

const channelDescription = computed(() => currentChannel.value?.description ?? "");

const inputPlaceholder = computed(() => {
  if (isDMView.value) {
    const dm = aiDM.value;
    if (dm?.id === channelId.value) return 'Pregúntale algo... "busca mi conversación con Jorge sobre la reunión"';
    return "Escribe un mensaje...";
  }
  return `Mensaje en #${currentChannel.value?.name ?? "canal"}`;
});

// ── Lifecycle ──────────────────────────────────────────────────────────────

let unsubChannel: (() => void) | null = null;
let unsubWS: (() => void) | null = null;

onMounted(async () => {
  await loadUserWorkspaces();

  const ws = workspacesMap.value[workspaceId.value];
  if (ws) setActiveWorkspace(ws);

  unsubWS = listenWorkspace(workspaceId.value);
  listenChannels(workspaceId.value);
  listenDMs(workspaceId.value);
  startHeartbeat(workspaceId.value);
  listenSuggestions(workspaceId.value);
  listenTasks(workspaceId.value);
  listenAgents(workspaceId.value);

  // Verificar si el usuario es admin/owner
  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();
    const members = await $fetch<Array<{ uid: string; displayName?: string; photoURL?: string; username?: string; role: string; permissions?: Record<string, boolean>; workspaceRole?: string; workspaceStatus?: string }>>(
      `/api/protected/workspaces/${workspaceId.value}/members`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    workspaceMembers.value = members.map((m) => ({
      uid: m.uid,
      displayName: m.displayName ?? m.uid,
      photoURL: m.photoURL,
      username: m.username,
      role: m.role,
      workspaceRole: m.workspaceRole,
      workspaceStatus: m.workspaceStatus,
    }));
    const me = members.find((m) => m.uid === user.value?.uid);
    isMemberAdmin.value = !!me && ["owner", "admin"].includes(me.role);
    if (me?.permissions) myPermissions.value = me.permissions;
  } catch {
    isMemberAdmin.value = activeWorkspace.value?.ownerId === user.value?.uid;
  }

  watchEffect(() => {
    unsubChannel?.();
    unsubChannel = listenMessages(workspaceId.value, channelId.value, isDMView.value);
    scrollToBottom();
  });
});

// Marcar canal como leído al entrar (fuera de watchEffect para evitar loop reactivo)
watch(
  [channelId, isDMView],
  ([cid, isDM]) => {
    if (!isDM && cid) {
      markRead(workspaceId.value, cid);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  unsubChannel?.();
  unsubWS?.();
  stopHeartbeat();
  aiStop();
  stopSuggestions();
  stopTasks();
  stopListeningAgents();
});

// ── Scroll ─────────────────────────────────────────────────────────────────

function scrollToBottom() {
  nextTick(() => bottomAnchor.value?.scrollIntoView({ behavior: "smooth" }));
}

watch(combinedMessages, (newMsgs, oldMsgs) => {
  const lastNewMsg = newMsgs[newMsgs.length - 1];
  const lastOldMsg = oldMsgs?.[oldMsgs.length - 1];

  // Si la lista estaba vacía y acaba de cargar la data inicial, ir SIEMPRE al fondo
  const isInitialLoad = !oldMsgs || oldMsgs.length === 0;

  // Si se agregó un mensaje NUEVO al final de la lista
  if (lastNewMsg && (isInitialLoad || lastNewMsg.id !== lastOldMsg?.id)) {
    // Si fue mandado por ti, o es de la IA, o es la primera carga inicial, nos vamos al fondo
    if (isInitialLoad || lastNewMsg.senderId === user.value?.uid) {
      scrollToBottom();
    }

    // Activar IA observadora solo en canales normales (NO en canales de agente, DMs, ni mensajes de sistema)
    const isAgentChannel = currentChannel.value?.type === 'agent';
    const isAiMessage = lastNewMsg.senderId === 'ai-assistant' || lastNewMsg.senderId?.startsWith('ai-');
    if (!isDMView.value && !isAgentChannel && !isAiMessage && lastNewMsg.type !== 'ai_suggestion' && lastNewMsg.type !== 'system' && lastNewMsg.type !== 'agent_notification' && lastNewMsg.type !== 'ai_search_result' && lastNewMsg.type !== 'calendar_event') {
      aiObserve(workspaceId.value, channelId.value, messages.value);
    }
  }
}, { deep: true });

// ── Acciones de mensajes ──────────────────────────────────────────────────

async function handleSend(content: string) {
  if (editingMessage.value) {
    await editMessage(workspaceId.value, channelId.value, editingMessage.value.id, content, isDMView.value);
    editingMessage.value = null;
  } else {
    const reply = replyingTo.value
      ? { replyToId: replyingTo.value.id, replyToPreview: replyingTo.value.content?.slice(0, 150) ?? "", replyToSenderName: replyingTo.value.senderName }
      : undefined;
    await sendMessage(workspaceId.value, channelId.value, content, isDMView.value, reply);
    replyingTo.value = null;
  }
}

function startReply(msg: Message) {
  replyingTo.value = msg;
  editingMessage.value = null;
}

function startEdit(msg: Message) {
  editingMessage.value = msg;
}

function cancelEdit() {
  editingMessage.value = null;
}

// ── Slash commands ────────────────────────────────────────────────────────

const activeCommand = ref<string | null>(null);

function handleSlashCommand(commandId: string) {
  activeCommand.value = commandId;
}

function closeCommand() {
  activeCommand.value = null;
}

// ── Estado del workspace ──────────────────────────────────────────────────

const workspaceStatusOptions = [
  { value: "available",       label: "Disponible",       icon: "🟢" },
  { value: "in_meeting",      label: "En reunión",        icon: "🔴" },
  { value: "busy",            label: "Ocupado",           icon: "🟡" },
  { value: "available_in_1h", label: "Disponible en 1h", icon: "⏰" },
  { value: "available_in_2h", label: "Disponible en 2h", icon: "⏰" },
  { value: "available_in_3h", label: "Disponible en 3h", icon: "⏰" },
];

function workspaceStatusLabel(status: string): string {
  return workspaceStatusOptions.find((o) => o.value === status)?.label ?? status;
}

const myWorkspaceStatus = computed(() =>
  workspaceMembers.value.find((m) => m.uid === user.value?.uid)?.workspaceStatus ?? ""
);

const availableMembers = computed(() =>
  workspaceMembers.value.filter((m) => m.workspaceStatus === "available")
);

const savingStatus = ref(false);

async function handleStatusChange(status: string) {
  savingStatus.value = true;
  try {
    const token = await getIdToken();
    await $fetch(`/api/protected/workspaces/${workspaceId.value}/my-profile`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceStatus: status },
    });
    // Actualizar localmente
    const me = workspaceMembers.value.find((m) => m.uid === user.value?.uid);
    if (me) me.workspaceStatus = status;
    closeCommand();
  } catch (err) {
    console.error("[handleStatusChange] Error:", err);
  } finally {
    savingStatus.value = false;
  }
}

async function handleResumeCommand() {
  closeCommand();

  const wsId = route.params.workspaceId as string;
  const chId = route.params.channelId as string;
  if (!wsId || !chId) return;

  try {
    const token = await getIdToken();
    await $fetch("/api/protected/ai/summarize", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId: wsId, channelId: chId },
    });
  } catch (err) {
    console.error("[handleResumeCommand] Error:", err);
  }
}

async function deleteMessage(messageId: string) {
  await doDelete(workspaceId.value, channelId.value, messageId, isDMView.value);
}

async function toggleReaction(messageId: string, emoji: string) {
  await doReact(workspaceId.value, channelId.value, messageId, emoji, isDMView.value);
}

// ── Typing indicator ──────────────────────────────────────────────────────

let typingClearTimer: ReturnType<typeof setTimeout> | null = null;
function handleTyping(isTyping: boolean) {
  clearTimeout(typingClearTimer!);
  setTypingIn(workspaceId.value, isTyping ? channelId.value : null);
  if (isTyping) {
    typingClearTimer = setTimeout(() => setTypingIn(workspaceId.value, null), 4000);
  }
}

// ── Action cards y combinedMessages ──────────────────────────────────────────

async function handleBubbleAction(msg: any, button: ActionButton) {
  console.log("[Chat] Action clicked:", button.actionType, button.payload);

  if (button.actionType === "dismiss") {
    return;
  }

  const contentToSend = (button.payload?.response as string) 
    || (button.payload?.text as string)
    || (button.payload?.value as string) 
    || button.label;

  await sendMessage(workspaceId.value, channelId.value, contentToSend, isDMView.value);
}

// ── Acciones de sugerencias IA (punto azul) ──────────────────────────────

async function handleSuggestionAction(data: { suggestion: any; button: ActionButton; context?: string }) {
  const { suggestion: sug, button, context } = data;

  if (button.actionType === "dismiss") {
    await dismissSuggestion(workspaceId.value, sug.id);
    return;
  }

  if (button.actionType === "agent_forward") {
    await forwardToAgent(sug, button, context);
    return;
  }

  if (button.actionType === "schedule_create") {
    await createSchedule(sug, button, context);
    return;
  }

  if (button.actionType === "task_add") {
    const desc = context
      ? `${button.payload?.description ?? sug.card.description}\n\nContexto: ${context}`
      : (button.payload?.description as string ?? sug.card.description);
    await addTask(workspaceId.value, { title: desc, sourceChannelId: channelId.value });
    await acceptSuggestion(workspaceId.value, sug.id, `Tarea creada: "${desc.slice(0, 100)}". Puedes verla en tus tareas pendientes.`);
  } else if (button.actionType === "dm_send") {
    await acceptSuggestion(workspaceId.value, sug.id);
    await handleOutboundMessage(sug, button, context);
    return;
  } else if (button.actionType === "calendar_create") {
    await acceptSuggestion(workspaceId.value, sug.id);
    await handleCalendarCreate(sug, button, context);
    return;
  } else if (button.actionType === "calendar_pick_time") {
    showTimePicker.value = true;
    pendingCalendarSug.value = { sug, button, context };
    return;
  } else if (button.actionType === "search") {
    await acceptSuggestion(workspaceId.value, sug.id);
    await handleSearch(sug, button, context);
    return;
  } else {
    await acceptSuggestion(workspaceId.value, sug.id, `Acción ejecutada: ${button.label}`);
  }
}

// ── Forward a agente externo ────────────────────────────────────────────

async function forwardToAgent(sug: any, button: ActionButton, context?: string) {
  const agentId = button.payload?.agentId as string;
  const baseDesc = button.payload?.taskDescription as string ?? sug.card.description;
  const taskDesc = context ? `${baseDesc}\n\nContexto adicional del usuario:\n${context}` : baseDesc;
  const replyTarget = (button.payload?.replyTarget as string) ?? "agent";

  if (!agentId) {
    console.error("[Chat] No agentId in forward payload");
    return;
  }

  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();

    // Obtener información del agente
    const agent = agents.value.find((a) => a.id === agentId);
    console.log("[Chat] Agent lookup:", { agentId, found: !!agent, hasPinHash: !!agent?.pinHash, totalAgents: agents.value.length });
    let pin: string | undefined;

    // Si el agente tiene PIN configurado, pedir al usuario
    if (agent?.pinHash) {
      pin = prompt("Este agente está protegido con PIN. Por favor, ingresa el PIN:");
      console.log("[Chat] PIN prompt result:", { pinProvided: !!pin });
      if (!pin) {
        console.warn("[Chat] User cancelled PIN prompt");
        return;
      }
    }

    const result = await $fetch<{ ok: boolean; dedicatedChannelId: string; replyTarget: string; replyDmId?: string }>("/api/protected/ai/forward-to-agent", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        workspaceId: workspaceId.value,
        agentId,
        taskDescription: taskDesc,
        additionalContext: context || undefined,
        sourceChannelId: channelId.value,
        suggestionId: sug.id,
        replyTarget,
        pin,
      },
    });

    const agentName = button.payload?.agentName as string ?? "agente";
    await acceptSuggestion(workspaceId.value, sug.id, `Tarea reenviada al ${agentName}. La respuesta llegará ${replyTarget === "source" ? "en este canal" : "en el canal del agente"}.`);

    if (replyTarget === "source") {
      // Quedarse en el canal actual
    } else if (replyTarget === "dm" && result.replyDmId) {
      navigateTo(`/chat/${workspaceId.value}/dm/${result.replyDmId}`);
    } else if (result.dedicatedChannelId) {
      navigateTo(`/chat/${workspaceId.value}/${result.dedicatedChannelId}`);
    }
  } catch (err: any) {
    if (err?.data?.message === "PIN requerido para usar este agente" || err?.data?.message === "PIN incorrecto") {
      await acceptSuggestion(workspaceId.value, sug.id, err?.data?.message ?? "PIN requerido o incorrecto.");
    } else {
      console.error("[Chat] Forward to agent failed:", err?.data ?? err);
      await acceptSuggestion(workspaceId.value, sug.id, "Error al reenviar al agente.");
    }
  }
}

// ── Crear automatización programada ──────────────────────────────────────

async function createSchedule(sug: any, button: ActionButton, context?: string) {
  const baseDesc = (button.payload?.description as string) ?? sug.card.description;
  const desc = context ? `${baseDesc}\n\nContexto: ${context}` : baseDesc;
  const deliveryTarget = (button.payload?.deliveryTarget as string) ?? "channel";

  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();

    // Si es personal, crear/obtener el DM de notificaciones
    let personalDmId: string | undefined;
    if (deliveryTarget === "personal") {
      const { openNotificationsDM } = useDMs();
      const { dmId } = await openNotificationsDM(workspaceId.value);
      personalDmId = dmId;
    }

    const isPersonal = deliveryTarget === "personal";

    const result = await $fetch<{ automationId: string; nextRunAt: string }>("/api/protected/automations/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        workspaceId: workspaceId.value,
        title: sug.card?.title ?? desc.slice(0, 60),
        description: desc,
        frequency: button.payload?.frequency ?? "once",
        time: button.payload?.time ?? null,
        dayOfWeek: button.payload?.dayOfWeek ?? null,
        dayOfMonth: button.payload?.dayOfMonth ?? null,
        date: button.payload?.date ?? null,
        sourceType: isPersonal ? "dm" : (isDMView.value ? "dm" : (currentChannel.value?.type === "agent" ? "agent" : "channel")),
        sourceChannelId: isPersonal ? undefined : (isDMView.value ? undefined : channelId.value),
        sourceChannelName: isPersonal ? undefined : (currentChannel.value?.name ?? undefined),
        sourceDmId: isPersonal ? personalDmId : (isDMView.value ? channelId.value : undefined),
        suggestionId: sug.id,
      },
    });

    const freqLabel: Record<string, string> = {
      once: "una vez", daily: "diariamente", weekly: "semanalmente", monthly: "mensualmente",
    };
    const freq = (button.payload?.frequency as string) ?? "once";
    const timeStr = button.payload?.time ? ` a las ${button.payload.time}` : "";
    const targetLabel = isPersonal ? "Recibirás la notificación en tu DM personal" : "La notificación llegará a este canal";
    const responseText = `Automatización programada: ${desc.slice(0, 100)}\nFrecuencia: ${freqLabel[freq] ?? freq}${timeStr}\nPróxima ejecución: ${new Date(result.nextRunAt).toLocaleString()}\n${targetLabel}`;
    await acceptSuggestion(workspaceId.value, sug.id, responseText);
  } catch (err: any) {
    console.error("[Chat] Create schedule failed:", err?.data ?? err);
    await acceptSuggestion(workspaceId.value, sug.id, "Error al crear la automatización.");
  }
}

// ── Observación manual (menú de tres puntos) ─────────────────────────────

function handleObserveManual(messageId: string) {
  aiObserveManual(workspaceId.value, channelId.value, messages.value, messageId);
}

// ── Búsqueda web con IA ─────────────────────────────────────────────────

async function handleSearch(sug: any, button: ActionButton, context?: string) {
  const searchQuery = context || (button.payload?.query as string) || sug.card?.description || sug.card?.title || "";
  if (!searchQuery.trim()) return;

  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();

    const searchResult = await $fetch<{ ok: boolean; result: string; sources: string[] }>("/api/protected/ai/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        workspaceId: workspaceId.value,
        query: searchQuery,
        skipMessage: true,
        ...(isDMView.value ? { dmId: channelId.value } : { channelId: channelId.value }),
      },
    });

    const responseText = searchResult.ok
      ? searchResult.result
      : "No se pudo completar la búsqueda.";

    await acceptSuggestion(workspaceId.value, sug.id, responseText);
  } catch (err: any) {
    console.error("[Chat] Search failed:", err?.data ?? err);
    await acceptSuggestion(workspaceId.value, sug.id, "Error al realizar la búsqueda. Intenta de nuevo.");
  }
}

// ── Crear evento de calendario ──────────────────────────────────────────

async function handleCalendarCreate(sug: any, button: ActionButton, context?: string) {
  const payload = button.payload ?? {};
  const title = (payload.title as string) || context || sug.card?.title || "Evento";
  const description = (payload.description as string) || sug.card?.description || "";
  const date = (payload.date as string) || sug.meta?.calendarDate || new Date().toISOString().split("T")[0];
  const time = (payload.time as string) || sug.meta?.calendarTime || "09:00";
  const duration = (payload.duration as number) || sug.meta?.calendarDuration || 60;

  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();

    const result = await $fetch<{ ok: boolean; eventId: string; calendarUrl: string; createdInGoogle?: boolean }>("/api/protected/calendar/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        workspaceId: workspaceId.value,
        title,
        description,
        date,
        time,
        duration,
        skipMessage: true,
        ...(isDMView.value ? { dmId: channelId.value } : { channelId: channelId.value }),
      },
    });

    const responseText = result.createdInGoogle
      ? `Evento "${title}" agendado en tu Google Calendar para el ${date} a las ${time} (${duration} min).`
      : `Evento "${title}" guardado para el ${date} a las ${time} (${duration} min). [Agregar a Google Calendar](${result.calendarUrl})`;

    // Guardar respuesta en la sugerencia
    await acceptSuggestion(workspaceId.value, sug.id, responseText);
  } catch (err: any) {
    console.error("[Chat] Calendar create failed:", err?.data ?? err);
    await acceptSuggestion(workspaceId.value, sug.id, "Error al crear el evento. Intenta de nuevo.");
  }
}

// ── Enviar mensaje a contacto (outbound_msg) ────────────────────────────

const showContactPicker = ref(false);
const contactMatches = ref<Array<{ uid: string; displayName: string; photoURL: string; username?: string; source: string }>>([]);
const pendingOutboundMessage = ref("");
const pendingOutboundSugId = ref("");
const pendingOutboundResponse = ref("");
const showTimePicker = ref(false);
const pendingCalendarSug = ref<{ sug: any; button: any; context?: string } | null>(null);
const customTime = ref("");
const contactSearching = ref(false);

async function handleOutboundMessage(sug: any, button: ActionButton, context?: string) {
  const recipientName = (button.payload?.recipientName as string) ?? "";
  const message = context || (button.payload?.suggestedMessage as string) || sug.card?.description || "";

  if (!recipientName) {
    console.error("[Chat] No recipientName in outbound payload");
    return;
  }

  pendingOutboundMessage.value = message;
  pendingOutboundSugId.value = sug.id;
  pendingOutboundResponse.value = "";
  contactSearching.value = true;

  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();

    const result = await $fetch<{ matches: typeof contactMatches.value }>("/api/protected/ai/resolve-contact", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId: workspaceId.value, recipientName },
    });

    if (result.matches.length === 0) {
      await acceptSuggestion(workspaceId.value, sug.id, `No se encontró a "${recipientName}" entre tus contactos o miembros del workspace.`);
    } else if (result.matches.length === 1) {
      await sendOutboundDM(result.matches[0]!.uid, result.matches[0]!.displayName, message);
      // Guardar response después de enviar
      if (pendingOutboundResponse.value) {
        await acceptSuggestion(workspaceId.value, sug.id, pendingOutboundResponse.value);
      }
    } else {
      contactMatches.value = result.matches;
      showContactPicker.value = true;
    }
  } catch (err: any) {
    console.error("[Chat] Resolve contact failed:", err?.data ?? err);
    await acceptSuggestion(workspaceId.value, sug.id, "Error al buscar el contacto.");
  } finally {
    contactSearching.value = false;
  }
}

async function sendOutboundDM(recipientId: string, recipientName: string, message: string) {
  showContactPicker.value = false;

  if (!message.trim()) {
    const { openDM } = useDMs();
    const { dmId } = await openDM(workspaceId.value, recipientId);
    navigateTo(`/chat/${workspaceId.value}/dm/${dmId}`);
    return;
  }

  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();

    await $fetch<{ ok: boolean; dmId: string }>("/api/protected/ai/send-outbound", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId: workspaceId.value, recipientId, message },
    });

    // La respuesta se guarda en la sugerencia correspondiente via handleOutboundMessage
    pendingOutboundResponse.value = `Mensaje enviado a ${recipientName}`;
  } catch (err: any) {
    console.error("[Chat] Send outbound DM failed:", err?.data ?? err);
    pendingOutboundResponse.value = `Error al enviar el mensaje a ${recipientName}.`;
  }
}

async function selectContactAndSend(contact: typeof contactMatches.value[0]) {
  await sendOutboundDM(contact.uid, contact.displayName, pendingOutboundMessage.value);
  if (pendingOutboundSugId.value && pendingOutboundResponse.value) {
    await acceptSuggestion(workspaceId.value, pendingOutboundSugId.value, pendingOutboundResponse.value);
  }
}

function confirmCustomTime() {
  if (!customTime.value || !pendingCalendarSug.value) return;
  const { sug, button, context } = pendingCalendarSug.value;
  const newButton = {
    ...button,
    actionType: "calendar_create",
    payload: { ...button.payload, time: customTime.value },
  };
  showTimePicker.value = false;
  pendingCalendarSug.value = null;
  customTime.value = "";
  handleCalendarCreate(sug, newButton, context);
}

// ── Mensajes fijados (Pins) ───────────────────────────────────────────────

async function handlePinMessage(msg: Message) {
  const isPinned = pinnedMessages.value.some((p) => p.messageId === msg.id);
  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();
    await $fetch("/api/protected/channels/pin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        workspaceId: workspaceId.value,
        channelId: channelId.value,
        messageId: msg.id,
        content: msg.content?.slice(0, 200) ?? "",
        senderName: msg.senderName,
        action: isPinned ? "unpin" : "pin",
      },
    });
    if (!isPinned) showPins.value = true;
  } catch (err: any) {
    const errMsg = err?.data?.message ?? "Error al fijar el mensaje";
    console.error("[Pin]", errMsg);
  }
}

async function unpinMessage(messageId: string) {
  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();
    await $fetch("/api/protected/channels/pin", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        workspaceId: workspaceId.value,
        channelId: channelId.value,
        messageId,
        action: "unpin",
      },
    });
  } catch (err: any) {
    console.error("[Unpin]", err?.data?.message ?? err);
  }
}

// ── Crear canal ───────────────────────────────────────────────────────────

async function createChannel() {
  if (!newChannelName.value.trim()) return;
  await doCreateChannel(workspaceId.value, {
    name: newChannelName.value,
    isPrivate: newChannelPrivate.value,
  });
  showCreateChannel.value = false;
  newChannelName.value = "";
}

// ── Gestión de miembros de canal privado ─────────────────────────────────

const canManageChannelMembers = computed(() =>
  isMemberAdmin.value || currentChannel.value?.createdBy === user.value?.uid
);

const channelMemberCount = computed(() =>
  currentChannel.value?.memberIds?.length ?? 0
);

const availableMembersToAdd = computed(() => {
  const currentIds = new Set(channelMembers.value.map((m) => m.uid));
  return workspaceMembers.value.filter((m) => !currentIds.has(m.uid));
});

async function openMembersModal() {
  showChannelMembers.value = true;
  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();
    const result = await $fetch<{ members: typeof channelMembers.value }>("/api/protected/channels/members", {
      headers: { Authorization: `Bearer ${token}` },
      params: { workspaceId: workspaceId.value, channelId: channelId.value },
    });
    channelMembers.value = result.members;
  } catch (err: any) {
    console.error("[channel-members] Load failed:", err?.data ?? err);
  }
}

async function addMemberToChannel() {
  if (!selectedMemberToAdd.value) return;
  addingMember.value = true;
  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();
    await $fetch("/api/protected/channels/members", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        workspaceId: workspaceId.value,
        channelId: channelId.value,
        memberIds: [selectedMemberToAdd.value],
        action: "add",
      },
    });
    selectedMemberToAdd.value = "";
    // Recargar lista
    await openMembersModal();
  } catch (err: any) {
    console.error("[channel-members] Add failed:", err?.data ?? err);
  }
  addingMember.value = false;
}

async function removeMemberFromChannel(uid: string) {
  if (!confirm("¿Quitar a este miembro del canal?")) return;
  try {
    const { getIdToken } = useAuth();
    const token = await getIdToken();
    await $fetch("/api/protected/channels/members", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        workspaceId: workspaceId.value,
        channelId: channelId.value,
        memberIds: [uid],
        action: "remove",
      },
    });
    await openMembersModal();
  } catch (err: any) {
    console.error("[channel-members] Remove failed:", err?.data ?? err);
  }
}

// ── Nuevo DM ────────────────────────────────────────────────────────────────

const dmSearch = ref("");
const startingDM = ref(false);

const filteredDMMembers = computed(() => {
  const q = dmSearch.value.trim().toLowerCase();
  return workspaceMembers.value.filter((m) => {
    if (m.uid === user.value?.uid) return false;
    if (!q) return true;
    return (
      m.displayName?.toLowerCase().includes(q) ||
      m.username?.toLowerCase().includes(q) ||
      m.workspaceRole?.toLowerCase().includes(q)
    );
  });
});

async function startDM(recipientId: string) {
  if (startingDM.value) return;
  startingDM.value = true;
  try {
    const token = await getIdToken();
    const { dmId } = await $fetch<{ dmId: string }>("/api/protected/dms/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { workspaceId: workspaceId.value, recipientId },
    });
    showNewDM.value = false;
    dmSearch.value = "";
    navigateTo(`/chat/${workspaceId.value}/dm/${dmId}`);
  } catch (err: any) {
    console.error("[new-dm] Error:", err?.data ?? err);
  } finally {
    startingDM.value = false;
  }
}
</script>
