<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const isOpen = ref(false)
const queryText = ref('')
const contextMode = ref<'selection' | 'page'>('selection')
const messages = ref<{role: 'user' | 'assistant', content: string}[]>([])
const inputValue = ref('')
const isLoading = ref(false)
const popoverPos = ref<{top: number, left: number, text: string} | null>(null)

const QUICK_PROMPTS = [
  { id: 'explain', label: '💡 Explain simply', prompt: 'Can you explain this selected concept in simple, practical terms?' },
  { id: 'tradeoffs', label: '⚖️ Trade-offs', prompt: 'What are the architectural trade-offs, performance costs, and memory limits of this?' },
  { id: 'code', label: '💻 Code example', prompt: 'Can you provide a practical code example illustrating this?' },
  { id: 'takeaways', label: '📝 Key takeaways', prompt: 'What are the key takeaways and production takeaways from this snippet?' },
]

const messagesContainer = ref<HTMLElement | null>(null)

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const checkSelection = () => {
  if (isOpen.value) return

  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) {
    popoverPos.value = null
    return
  }

  const text = selection.toString().trim()
  if (text.length < 3) {
    popoverPos.value = null
    return
  }

  try {
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      popoverPos.value = null
      return
    }

    const top = Math.max(12, rect.top - 44)
    const left = Math.max(16, Math.min(window.innerWidth - 170, rect.left + rect.width / 2 - 75))

    popoverPos.value = { top, left, text }
  } catch {
    popoverPos.value = null
  }
}

let selectionTimeout: any = null
const handleSelectionChange = () => {
  clearTimeout(selectionTimeout)
  selectionTimeout = setTimeout(checkSelection, 100)
}

const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
    const text = window.getSelection()?.toString().trim()
    e.preventDefault()
    if (text) {
      openWithSelection(text)
    } else {
      openPageContext()
    }
  }
}

onMounted(() => {
  document.addEventListener('selectionchange', handleSelectionChange)
  window.addEventListener('pointerup', handleSelectionChange)
  window.addEventListener('touchend', handleSelectionChange)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('selectionchange', handleSelectionChange)
  window.removeEventListener('pointerup', handleSelectionChange)
  window.removeEventListener('touchend', handleSelectionChange)
  window.removeEventListener('keydown', handleKeyDown)
  clearTimeout(selectionTimeout)
})

const openWithSelection = (text: string) => {
  queryText.value = text
  contextMode.value = 'selection'
  popoverPos.value = null
  isOpen.value = true
  try {
    window.getSelection()?.removeAllRanges()
  } catch {}
  initConversation()
}

const openPageContext = () => {
  queryText.value = ''
  contextMode.value = 'page'
  popoverPos.value = null
  isOpen.value = true
  initConversation()
}

const initConversation = () => {
  if (queryText.value) {
    messages.value = [{ role: 'assistant', content: `I see you selected **"${queryText.value}"**. Select a quick question below or ask me anything about this concept!` }]
  } else {
    messages.value = [{ role: 'assistant', content: 'I can answer questions about the content of this page. What would you like to explore?' }]
  }
}

const handleSendMessage = async (overridePrompt?: string) => {
  const textToSend = overridePrompt || inputValue.value
  if (!textToSend.trim() || isLoading.value) return

  if (!overridePrompt) {
    inputValue.value = ''
  }

  const history = [...messages.value]
  messages.value.push({ role: 'user', content: textToSend })
  isLoading.value = true
  scrollToBottom()

  try {
    const pageTitle = document.title
    const proseElement = document.querySelector('.vp-doc')
    const pageText = proseElement ? proseElement.textContent || '' : ''

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: textToSend,
        history: history,
        selectedText: contextMode.value === 'selection' ? queryText.value : '',
        pageTitle,
        pageText: pageText.substring(0, 15000),
      }),
    })

    if (!response.ok) throw new Error('Failed to fetch AI response')

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader stream')
    const decoder = new TextDecoder()
    let done = false
    let replyContent = ''

    messages.value.push({ role: 'assistant', content: '' })
    isLoading.value = false
    scrollToBottom()

    while (!done) {
      const { value, done: doneReading } = await reader.read()
      done = doneReading
      if (value) {
        const chunk = decoder.decode(value, { stream: !done })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.response) {
                replyContent += data.response
                const lastMessage = messages.value[messages.value.length - 1];
                if (lastMessage) {
                  lastMessage.content = replyContent;
                }
                scrollToBottom()
              }
            } catch (e) {}
          }
        }
      }
    }
  } catch (err) {
    console.error(err)
    messages.value.push({ role: 'assistant', content: 'Sorry, I encountered an error answering your question. Please try again.' })
    isLoading.value = false
    scrollToBottom()
  }
}

const closeDialog = () => {
  isOpen.value = false
}
</script>

<template>
  <div class="engram-ai-wrapper">
    <!-- Floating Selection Popover -->
    <div v-if="popoverPos" class="engram-popover" :style="{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }">
      <button @click="openWithSelection(popoverPos.text)" class="engram-popover-btn">
        <svg class="engram-icon-small" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" stroke="#7cd1f9" stroke-width="2" stroke-linecap="round" stroke-dasharray="68 18"/><polygon points="16,25 7,20.5 16,16 25,20.5" fill="#7cd1f9" opacity="0.35"/><polygon points="16,20 7,15.5 16,11 25,15.5" fill="#7cd1f9" opacity="0.7"/><polygon points="16,15 7,10.5 16,6 25,10.5" stroke="#7cd1f9" stroke-width="1.5" fill="#0f1117"/><circle cx="16" cy="10.5" r="2.2" fill="#7cd1f9"/></svg>
        <span>Ask Engram</span>
      </button>
    </div>

    <!-- Floating Action Button (FAB) -->
    <div class="engram-fab-container">
      <button @click="openPageContext()" :class="['engram-fab', popoverPos ? 'engram-fab-pulse' : '']" aria-label="Ask Engram">
        <span class="engram-fab-ping"></span>
        <svg class="engram-icon-large" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" stroke="#7cd1f9" stroke-width="2" stroke-linecap="round" stroke-dasharray="68 18"/><polygon points="16,25 7,20.5 16,16 25,20.5" fill="#7cd1f9" opacity="0.35"/><polygon points="16,20 7,15.5 16,11 25,15.5" fill="#7cd1f9" opacity="0.7"/><polygon points="16,15 7,10.5 16,6 25,10.5" stroke="#7cd1f9" stroke-width="1.5" fill="#0f1117"/><circle cx="16" cy="10.5" r="2.2" fill="#7cd1f9"/></svg>
      </button>
    </div>

    <!-- Chat Dialog -->
    <div v-if="isOpen" class="engram-modal-overlay" @click.self="closeDialog">
      <div class="engram-modal">
        <!-- Header -->
        <div class="engram-modal-header">
          <button @click="closeDialog" class="engram-close-btn">
            <svg class="close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 class="engram-modal-title">
            <svg class="engram-icon-small" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" stroke="#7cd1f9" stroke-width="2" stroke-linecap="round" stroke-dasharray="68 18"/><polygon points="16,25 7,20.5 16,16 25,20.5" fill="#7cd1f9" opacity="0.35"/><polygon points="16,20 7,15.5 16,11 25,15.5" fill="#7cd1f9" opacity="0.7"/><polygon points="16,15 7,10.5 16,6 25,10.5" stroke="#7cd1f9" stroke-width="1.5" fill="#0f1117"/><circle cx="16" cy="10.5" r="2.2" fill="#7cd1f9"/></svg>
            Ask Engram
          </h2>
          <p class="engram-modal-subtitle">
            Powered by <a class="engram-link" href="https://memofs.dev" target="_blank">MemoFS</a>.
          </p>
          <div v-if="contextMode === 'selection'" class="engram-selection-preview">
            "{{ queryText }}"
          </div>
          <div v-else class="engram-page-preview">Context: <strong>Current Page</strong></div>
        </div>

        <!-- Messages Area -->
        <div ref="messagesContainer" class="engram-messages-area">
          <div v-for="(msg, index) in messages" :key="index" :class="['engram-message-row', msg.role === 'user' ? 'is-user' : 'is-assistant']">
            <div class="engram-avatar">
              <svg v-if="msg.role === 'user'" class="user-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
              <svg v-else class="assistant-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" stroke="#7cd1f9" stroke-width="2" stroke-linecap="round" stroke-dasharray="68 18"/><polygon points="16,15 7,10.5 16,6 25,10.5" stroke="#7cd1f9" stroke-width="1.5" fill="#0f1117"/><circle cx="16" cy="10.5" r="2.2" fill="#7cd1f9"/></svg>
            </div>
            <div class="engram-message-content-wrapper">
              <p class="engram-message-sender">{{ msg.role === 'user' ? 'You' : 'Engram' }}</p>
              <div class="engram-message-bubble">
                {{ msg.content }}
              </div>
            </div>
          </div>
          <div v-if="isLoading" class="engram-message-row is-assistant">
            <div class="engram-avatar">
               <svg class="assistant-icon animate-pulse" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" stroke="#7cd1f9" stroke-width="2" stroke-linecap="round" stroke-dasharray="68 18"/><polygon points="16,15 7,10.5 16,6 25,10.5" stroke="#7cd1f9" stroke-width="1.5" fill="#0f1117"/><circle cx="16" cy="10.5" r="2.2" fill="#7cd1f9"/></svg>
            </div>
            <div class="engram-message-content-wrapper">
              <p class="engram-message-sender">Engram</p>
              <div class="engram-typing-indicator">Thinking...</div>
            </div>
          </div>
        </div>

        <!-- Inputs & Prompts -->
        <div class="engram-modal-footer">
          <div v-if="contextMode === 'selection' && !isLoading" class="engram-quick-prompts">
            <span class="engram-quick-prompts-title">Quick Questions</span>
            <div class="engram-quick-prompts-list">
              <button v-for="item in QUICK_PROMPTS" :key="item.id" @click="handleSendMessage(item.prompt)" class="engram-prompt-btn">
                {{ item.label }}
              </button>
            </div>
          </div>

          <!-- Engram Input Section (Disabled)
          <form @submit.prevent="handleSendMessage()" class="engram-input-form">
            <input v-model="inputValue" :disabled="isLoading" type="text" placeholder="Ask a follow up question..." class="engram-input" />
            <button type="submit" :disabled="isLoading || !inputValue.trim()" class="engram-submit-btn">
              <svg class="send-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </form>
          -->

          <div class="engram-coming-soon-container">
            <span class="engram-coming-soon-badge">
              <span class="coming-soon-dot"></span>
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.engram-popover {
  position: fixed;
  z-index: 50;
  pointer-events: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  transition: all 0.15s ease;
}

.engram-popover-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #18181b;
  border: 1px solid rgba(124, 209, 249, 0.6);
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 0 15px rgba(124, 209, 249, 0.3);
  transition: all 0.15s ease;
  border-radius: 6px;
}

.engram-popover-btn:hover {
  background-color: #7cd1f9;
  color: #18181b;
}

.engram-icon-small {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.engram-fab-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 40;
}

@media (min-width: 768px) {
  .engram-fab-container {
    bottom: 32px;
    right: 32px;
  }
}

.engram-fab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #18181b;
  border: 1px solid rgba(124, 209, 249, 0.4);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.engram-fab:hover {
  transform: scale(1.05);
}

.engram-fab:active {
  transform: scale(0.95);
}

.engram-fab-pulse {
  border-color: #7cd1f9;
  box-shadow: 0 0 15px rgba(124, 209, 249, 0.4);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

.engram-fab-ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-color: rgba(124, 209, 249, 0.2);
  animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.engram-fab-container:hover .engram-fab-ping {
  opacity: 0;
}

@keyframes ping {
  75%, 100% { transform: scale(1.5); opacity: 0; }
}

.engram-icon-large {
  width: 24px;
  height: 24px;
  position: relative;
  z-index: 10;
}

.engram-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.engram-modal {
  background-color: #09090b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: 448px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: modal-enter 0.2s ease-out;
}

@keyframes modal-enter {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.engram-modal-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.engram-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  color: #71717a;
  cursor: pointer;
  background: transparent;
  border: none;
  transition: color 0.2s;
}

.engram-close-btn:hover {
  color: #fff;
}

.close-icon {
  width: 20px;
  height: 20px;
}

.engram-modal-title {
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
}

.engram-modal-subtitle {
  color: #a1a1aa;
  font-size: 12px;
  margin: 8px 0 0 0;
}

.engram-link {
  color: #7cd1f9;
  font-weight: 600;
  text-decoration: none;
}

.engram-selection-preview {
  margin-top: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px;
  color: #d4d4d8;
  font-family: monospace;
  font-size: 11px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.engram-page-preview {
  margin-top: 8px;
  font-size: 12px;
  color: #a1a1aa;
}

.engram-page-preview strong {
  color: #e4e4e7;
}

.engram-messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 250px;
  scroll-behavior: smooth;
}

.engram-message-row {
  display: flex;
  gap: 12px;
}

.engram-message-row.is-user {
  flex-direction: row-reverse;
}

.engram-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.is-user .engram-avatar {
  background-color: rgba(255, 255, 255, 0.1);
}

.is-assistant .engram-avatar {
  background-color: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.user-icon {
  width: 16px;
  height: 16px;
  color: #a1a1aa;
}

.assistant-icon {
  width: 20px;
  height: 20px;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.engram-message-content-wrapper {
  flex: 1;
}

.is-user .engram-message-content-wrapper {
  text-align: right;
}

.engram-message-sender {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 2px 0;
}

.engram-message-bubble {
  font-size: 14px;
  color: #d4d4d8;
  line-height: 1.6;
  white-space: pre-wrap;
  text-align: left;
}

.is-user .engram-message-bubble {
  display: inline-block;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border-top-right-radius: 4px;
  padding: 8px 16px;
}

.engram-typing-indicator {
  font-size: 14px;
  color: #71717a;
  font-style: italic;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.engram-modal-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(9, 9, 11, 0.8);
}

.engram-quick-prompts {
  margin-bottom: 12px;
}

.engram-quick-prompts-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #71717a;
  margin-bottom: 8px;
  display: block;
}

.engram-quick-prompts-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.engram-prompt-btn {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #d4d4d8;
  cursor: pointer;
  transition: all 0.2s;
}

.engram-prompt-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(124, 209, 249, 0.4);
  color: #fff;
}

.engram-input-form {
  display: flex;
  align-items: center;
  gap: 8px;
}

.engram-input {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  color: #fff;
  outline: none;
  transition: border-color 0.2s;
}

.engram-input:focus {
  border-color: #7cd1f9;
}

.engram-submit-btn {
  background-color: #7cd1f9;
  color: #18181b;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s, opacity 0.2s;
}

.engram-submit-btn:hover:not(:disabled) {
  background-color: rgba(124, 209, 249, 0.9);
}

.engram-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  width: 18px;
  height: 18px;
}

.engram-coming-soon-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 16px;
  width: 100%;
}

.engram-coming-soon-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 18px;
  background: rgba(124, 209, 249, 0.08);
  border: 1px solid rgba(124, 209, 249, 0.25);
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  color: #7cd1f9;
  letter-spacing: 0.03em;
  box-shadow: 0 0 12px rgba(124, 209, 249, 0.12);
}

.coming-soon-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #7cd1f9;
  box-shadow: 0 0 8px #7cd1f9;
  animation: comingSoonPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes comingSoonPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.85);
  }
}
</style>
