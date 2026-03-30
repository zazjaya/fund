<template>
  <div class="index-strip">
    <div
      v-for="item in data"
      :key="item.code"
      class="index-card"
    >
      <div class="index-card-title">{{ item.name || item.code }}</div>
      <div class="index-card-main" :class="priceClass(item)">
        {{ formatPrice(item.last) }}
      </div>
      <div class="index-card-sub" :class="priceClass(item)">
        {{ formatChange(item) }} {{ formatPct(item) }}
      </div>
    </div>
    <div v-if="!data || !data.length" class="muted">
      指数数据加载中...
    </div>
  </div>
</template>

<script setup>
defineProps({
  data: {
    type: Array,
    default: () => []
  }
})

function formatPrice(val) {
  if (val == null || isNaN(parseFloat(val))) return '--'
  return parseFloat(val).toFixed(2)
}

function formatChange(item) {
  if (item.chg == null || isNaN(parseFloat(item.chg))) return '--'
  const sign = item.pct >= 0 ? '+' : ''
  return sign + parseFloat(item.chg).toFixed(2)
}

function formatPct(item) {
  if (item.pct == null || isNaN(parseFloat(item.pct))) return '--'
  const sign = item.pct >= 0 ? '+' : ''
  return sign + parseFloat(item.pct).toFixed(2) + '%'
}

function priceClass(item) {
  if (item.pct == null || isNaN(parseFloat(item.pct))) return ''
  return parseFloat(item.pct) >= 0 ? 'positive' : 'negative'
}
</script>

<style scoped>
.index-strip {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  background: #fff;
  overflow-x: auto;
  border-bottom: 1px solid #e8e8e8;
}

.index-card {
  flex: 1;
  min-width: 120px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.index-card:hover {
  border-color: #4f46e5;
  background: #f5f7ff;
}

.index-card-title {
  font-size: 12px;
  margin-bottom: 6px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.index-card-main {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.5px;
}

.index-card-sub {
  font-size: 13px;
  margin-top: 2px;
  color: #374151;
  font-weight: 600;
}

.positive {
  color: #dc2626;
}

.negative {
  color: #16a34a;
}

.muted {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 13px;
}

@media (max-width: 768px) {
  .index-strip {
    padding: 12px 16px;
    gap: 8px;
  }

  .index-card {
    min-width: 100px;
    padding: 10px 14px;
  }

  .index-card-title {
    font-size: 11px;
    margin-bottom: 4px;
  }

  .index-card-main {
    font-size: 16px;
  }

  .index-card-sub {
    font-size: 11px;
    margin-top: 2px;
  }
}

@media (max-width: 480px) {
  .index-strip {
    padding: 8px 12px;
    gap: 6px;
  }

  .index-card {
    min-width: 80px;
    padding: 8px 10px;
  }

  .index-card-title {
    font-size: 10px;
    margin-bottom: 4px;
  }

  .index-card-main {
    font-size: 14px;
  }

  .index-card-sub {
    font-size: 10px;
    margin-top: 2px;
  }
}
</style>