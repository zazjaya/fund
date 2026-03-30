<template>
  <div class="toolbar">
    <div class="toolbar-row">
      <el-input
        v-model="localKeyword"
        placeholder="搜索代码/名称"
        class="search-input"
        clearable
        @input="onSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select v-model="localSourceMode" class="source-select" placeholder="数据源">
        <el-option label="自动" value="auto" />
        <el-option label="fundgz" value="fundgz" />
        <el-option label="东财" value="em" />
      </el-select>

      <el-button
        type="primary"
        :loading="loading"
        @click="$emit('refresh')"
      >
        <el-icon v-if="!loading"><Refresh /></el-icon>
        {{ loading ? '刷新中' : '刷新' }}
      </el-button>

      <el-button
        v-if="showManageBtn"
        @click="$emit('manage')"
      >
        <el-icon><Setting /></el-icon>
        管理基金
      </el-button>

      <span v-if="lastUpdate && !loading" class="update-time">{{ formatTime(lastUpdate) }}</span>
    </div>

    <div class="toolbar-row">
      <el-radio-group v-model="viewMode" class="view-toggle" @change="switchView">
        <el-radio-button value="mine">看自己</el-radio-button>
        <el-radio-button value="all">看全部</el-radio-button>
      </el-radio-group>

      <div class="key-input-wrapper">
        <el-input
          v-model="localKey"
          placeholder="密钥"
          class="key-input"
          clearable
          @change="onKeyChange"
          @keyup.enter="onKeyChange"
        >
          <template #prefix>
            <el-icon><Key /></el-icon>
          </template>
        </el-input>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Search, Refresh, Setting, Key } from '@element-plus/icons-vue'

const props = defineProps({
  keyValue: { type: String, default: '' },
  sourceMode: { type: String, default: 'auto' },
  validKey: { type: String, default: '' },
  lastUpdate: { type: Date, default: null },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:keyValue', 'update:sourceMode', 'update:showAll', 'refresh', 'manage', 'search'])

const localSourceMode = ref(props.sourceMode)
const localKeyword = ref('')
const localKey = ref(props.keyValue)
const viewMode = ref(props.keyValue ? 'mine' : 'all')
const showAll = ref(!props.keyValue)

const showManageBtn = computed(() => !!props.validKey)

watch(() => props.sourceMode, (val) => {
  localSourceMode.value = val
})

watch(localSourceMode, (val) => {
  emit('update:sourceMode', val)
})

// 标记是否正在切换视图模式（避免 watch 清除密钥）
let isSwitchingView = false

watch(() => props.keyValue, (val) => {
  if (isSwitchingView) return
  viewMode.value = val ? 'mine' : 'all'
  localKey.value = val
})

function switchView(mode) {
  isSwitchingView = true
  if (mode === 'mine') {
    showAll.value = false
    emit('update:showAll', false)
    // 如果有密钥，切换到自己的分组
    if (localKey.value.trim()) {
      emit('update:keyValue', localKey.value.trim())
    }
  } else {
    showAll.value = true
    emit('update:showAll', true)
    // 切换到全部，但保留密钥输入框的值
    emit('update:keyValue', '')
  }
  // 延迟重置标记，确保 watch 不会在切换期间更新 localKey
  setTimeout(() => {
    isSwitchingView = false
  }, 0)
}

function onSearch() {
  emit('search', localKeyword.value.trim())
}

function onKeyChange() {
  const val = localKey.value.trim()
  emit('update:keyValue', val)
  viewMode.value = val ? 'mine' : 'all'
}

function formatTime(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  return `更新时间：${y}-${m}-${d} ${h}:${min}`
}
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 180px;
}

.source-select {
  width: 110px;
}

.key-input-wrapper {
  width: 140px;
}

.view-toggle {
  --el-radio-button-checked-bg-color: #4f46e5;
  --el-radio-button-checked-border-color: #4f46e5;
}

.update-time {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
  margin-left: 8px;
}

@media (max-width: 768px) {
  .toolbar {
    gap: 10px;
    padding: 12px 0;
  }

  .toolbar-row {
    gap: 8px;
  }

  .search-input {
    width: 140px;
  }

  .source-select {
    width: 90px;
  }

  .key-input-wrapper {
    width: 100px;
  }
}

@media (max-width: 480px) {
  .toolbar {
    gap: 8px;
    padding: 10px 0;
  }

  .toolbar-row {
    gap: 6px;
  }

  .search-input {
    flex: 1;
    min-width: 120px;
    width: auto;
  }

  .source-select {
    width: 80px;
  }

  .key-input-wrapper {
    flex: 1;
    min-width: 100px;
    width: auto;
  }

  .update-time {
    font-size: 11px;
    width: 100%;
    margin-left: 0;
    margin-top: 4px;
  }
}
</style>