<template>
  <el-menu
    mode="horizontal"
    :ellipsis="false"
    class="header-menu"
  >
    <div class="header-left">
      <div class="logo">
        <el-icon><TrendCharts /></el-icon>
        <span class="title">基金监控</span>
        <span class="subtitle">实时估值 · 智能建议</span>
      </div>
    </div>
    <div class="header-right">
      <el-menu-item index="time">
        <el-icon><Clock /></el-icon>
        <span v-if="lastUpdate">{{ formatTime(lastUpdate) }}</span>
        <span v-else>等待更新...</span>
      </el-menu-item>
    </div>
  </el-menu>
</template>

<script setup>
import { TrendCharts, Clock } from '@element-plus/icons-vue'

defineProps({
  lastUpdate: {
    type: Date,
    default: null
  }
})

function formatTime(date) {
  if (!date) return ''
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}
</script>

<style scoped>
.header-menu {
  padding: 0 24px;
  border-bottom: 1px solid #e8e8e8;
}

.header-left {
  flex: 1;
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 60px;
}

.logo :deep(.el-icon) {
  font-size: 24px;
  color: #4f46e5;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.3px;
}

.subtitle {
  font-size: 12px;
  color: #4f46e5;
  font-weight: 500;
  margin-left: 4px;
}

.header-right {
  display: flex;
  align-items: center;
}

.header-right :deep(.el-menu-item) {
  height: 60px;
  line-height: 60px;
  font-size: 13px;
  color: #666;
}

.header-right :deep(.el-icon) {
  margin-right: 4px;
}

@media (max-width: 768px) {
  .header-menu {
    padding: 0 16px;
  }

  .subtitle {
    display: none;
  }

  .title {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .header-menu {
    padding: 0 12px;
  }

  .logo :deep(.el-icon) {
    font-size: 20px;
  }

  .title {
    font-size: 15px;
  }

  .header-right :deep(.el-menu-item) {
    font-size: 12px;
    padding: 0 12px;
  }
}
</style>