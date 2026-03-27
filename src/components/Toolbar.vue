<template>
  <div class="toolbar">
    <input
      v-model="localKeyword"
      type="text"
      placeholder="搜索代码/名称"
      class="search-input"
      @input="onSearch"
    />

    <div class="view-toggle">
      <button
        class="toggle-btn"
        :class="{ active: viewMode === 'mine' }"
        @click="switchView('mine')"
      >看自己</button>
      <button
        class="toggle-btn"
        :class="{ active: viewMode === 'all' }"
        @click="switchView('all')"
      >看全部</button>
    </div>

    <div class="key-input-wrapper">
      <input
        v-model="localKey"
        type="text"
        placeholder="密钥"
        class="key-input"
        @change="onKeyChange"
        @keypress.enter="onKeyChange"
      />
      <button v-if="localKey" class="key-delete-btn" @click="clearKey">×</button>
    </div>

    <select v-model="localSourceMode" class="source-select">
      <option value="auto">自动</option>
      <option value="fundgz">fundgz</option>
      <option value="em">东财</option>
    </select>

    <button
      class="refresh-btn"
      :class="{ 'loading': loading }"
      :disabled="loading"
      @click="$emit('refresh')"
    >
      <span v-if="loading" class="spinner-small"></span>
      {{ loading ? '刷新中' : '刷新' }}
    </button>
    <span v-if="lastUpdate && !loading" class="update-time">{{ formatTime(lastUpdate) }}</span>

    <button
      v-if="showManageBtn"
      class="manage-btn"
      @click="$emit('manage')"
    >管理基金</button>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  keyValue: { type: String, default: '' },
  sourceMode: { type: String, default: 'auto' },
  validKey: { type: String, default: '' },
  lastUpdate: { type: Date, default: null },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:keyValue', 'update:sourceMode', 'refresh', 'manage', 'search'])

const localSourceMode = ref(props.sourceMode)
const localKeyword = ref('')
const localKey = ref(props.keyValue)
const viewMode = ref(props.keyValue ? 'mine' : 'all')

const showManageBtn = computed(() => !!props.validKey)

watch(() => props.sourceMode, (val) => {
  localSourceMode.value = val
})

watch(localSourceMode, (val) => {
  emit('update:sourceMode', val)
})

watch(() => props.keyValue, (val) => {
  viewMode.value = val ? 'mine' : 'all'
})

function switchView(mode) {
  viewMode.value = mode
  if (mode === 'mine') {
    emit('update:keyValue', localKey.value.trim())
  } else {
    emit('update:keyValue', '')
  }
}

function onSearch() {
  emit('search', localKeyword.value.trim())
}

function onKeyChange() {
  const val = localKey.value.trim()
  emit('update:keyValue', val)
  viewMode.value = val ? 'mine' : 'all'
}

function clearKey() {
  localKey.value = ''
  viewMode.value = 'all'
  emit('update:keyValue', '')
}

function formatTime(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  return `更新时间：${y}-${m}-${d} ${h}:${min}:${s}`
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  padding: 16px 0;
}

.search-input {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  width: 160px;
  font-size: 14px;
  background: #fff;
  transition: all 0.15s;
}

.search-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.view-toggle {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #d1d5db;
}

.toggle-btn {
  padding: 8px 16px;
  border: none;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
}

.toggle-btn:not(:last-child) {
  border-right: 1px solid #d1d5db;
}

.toggle-btn:hover {
  background: #f9fafb;
}

.toggle-btn.active {
  background: #4f46e5;
  color: #fff;
}

.key-input-wrapper {
  position: relative;
  display: inline-block;
}

.key-input {
  padding: 8px 28px 8px 14px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  width: 100px;
  font-size: 14px;
  background: #fff;
  transition: all 0.15s;
}

.key-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.key-delete-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  padding: 0 4px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 16px;
}

.key-delete-btn:hover {
  color: #dc2626;
}

.source-select {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}

.source-select:focus {
  outline: none;
  border-color: #4f46e5;
}

.refresh-btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}

.refresh-btn:hover:not(:disabled) {
  background: #4338ca;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn.loading {
  background: #9ca3af;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.manage-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
}

.manage-btn:hover {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #f5f7ff;
}

.update-time {
  font-size: 14px;
  color: #6b7280;
  margin-left: 4px;
  font-weight: 600;
}
</style>