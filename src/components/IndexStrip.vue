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
  padding: 20px 40px;
  background: #fff;
  overflow-x: auto;
  border-bottom: 1px solid #eaeaea;
}

.index-card {
  flex: 1;
  min-width: 140px;
  padding: 16px 20px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  transition: all 0.2s ease;
}

.index-card:hover {
  border-color: #d0d0d0;
  background: #f5f5f5;
}

.index-card-title {
  font-size: 13px;
  margin-bottom: 8px;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.index-card-main {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.5px;
}

.index-card-sub {
  font-size: 14px;
  margin-top: 4px;
  color: #374151;
  font-weight: 600;
}

.positive {
  color: #d73a49;
}

.negative {
  color: #28a745;
}
</style>