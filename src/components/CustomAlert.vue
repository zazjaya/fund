<template>
  <Teleport to="body">
    <div v-if="show" class="custom-alert-backdrop" @click.self="onBackdropClick">
      <div class="custom-alert-box">
        <div class="custom-alert-title">{{ title }}</div>
        <div class="custom-alert-message">{{ message }}</div>
        <div class="custom-alert-buttons">
          <button v-if="showCancel" class="custom-alert-cancel" @click="onCancel">
            取消
          </button>
          <button class="custom-alert-button" @click="onConfirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  title: { type: String, default: '提示' },
  message: { type: String, default: '' },
  showCancel: { type: Boolean, default: false },
  confirmText: { type: String, default: '确定' }
})

const emit = defineEmits(['confirm', 'cancel'])

const show = ref(false)

// 提供给外部调用的方法
function open() {
  show.value = true
}

function close() {
  show.value = false
}

function onConfirm() {
  show.value = false
  emit('confirm', true)
}

function onCancel() {
  show.value = false
  emit('cancel', false)
}

function onBackdropClick() {
  if (props.showCancel) {
    onCancel()
  } else {
    onConfirm()
  }
}

// 暴露方法供外部调用
defineExpose({ open, close })

// 全局 alert/confirm 方法
let resolvePromise = null

function alert(msg, title = '提示') {
  return new Promise((resolve) => {
    resolvePromise = resolve
    // 这里需要配合全局状态管理
    show.value = true
  })
}
</script>

<style scoped>
.custom-alert-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.custom-alert-box {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  min-width: 320px;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: alertFadeIn 0.2s ease-out;
}

@keyframes alertFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.custom-alert-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
}

.custom-alert-message {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin-bottom: 20px;
}

.custom-alert-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.custom-alert-button {
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.custom-alert-button:hover {
  background: #2563eb;
}

.custom-alert-cancel {
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.custom-alert-cancel:hover {
  background: #f1f5f9;
}
</style>