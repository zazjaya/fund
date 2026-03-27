<template>
  <tr :data-code="fund.FCODE">
    <td class="code">{{ fund.FCODE || '--' }}</td>
    <td class="name">{{ fund.SHORTNAME || '--' }}</td>
    <td class="gsz">{{ fund.GSZ != null ? fund.GSZ.toFixed(4) : '--' }}</td>
    <td class="chg" :class="chgClass">{{ chgText }}</td>
    <td class="j">{{ jDaily }}</td>
    <td class="phase">{{ phase }}</td>
    <td class="advice" :class="adviceClass">
      <div v-if="holdAction">持仓：{{ holdAction }}</div>
      <div v-if="holdAction && flatAction" class="divider">————</div>
      <div v-if="flatAction">空仓：{{ flatAction }}</div>
      <span v-if="!holdAction && !flatAction">{{ advice?.action || '--' }}</span>
    </td>
    <td class="reason">
      <div v-for="r in holdReasons" :key="r">持仓：{{ r }}</div>
      <div v-if="holdReasons.length && flatReasons.length" class="divider">————</div>
      <div v-for="r in flatReasons" :key="r">空仓：{{ r }}</div>
      <span v-if="!holdReasons.length && !flatReasons.length && !advice?.reasons?.length">--</span>
      <span v-if="!holdReasons.length && !flatReasons.length && advice?.reasons?.length">{{ advice.reasons[0] }}</span>
    </td>
    <td class="time">{{ fund.GZTIME || '--' }}</td>
  </tr>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  fund: { type: Object, required: true },
  advice: { type: Object, default: () => ({}) }
})

const chg = computed(() => {
  if (props.fund.GSZ != null && props.fund.GSZZL != null) {
    return parseFloat(props.fund.GSZZL)
  }
  if (props.fund.LAST_CHG != null) {
    return parseFloat(props.fund.LAST_CHG)
  }
  return null
})

const chgClass = computed(() => {
  if (chg.value == null) return ''
  return chg.value > 0 ? 'positive' : (chg.value < 0 ? 'negative' : '')
})

const chgText = computed(() => {
  if (chg.value == null) return '--'
  return (chg.value > 0 ? '+' : '') + chg.value.toFixed(2) + '%'
})

const jDaily = computed(() => {
  const j = props.advice?.metrics?.j_daily_3m
  return j != null ? parseFloat(j).toFixed(1) : '--'
})

const phase = computed(() => {
  return props.advice?.metrics?.phase || '--'
})

const holdAction = computed(() => props.advice?.metrics?.hold_action || '')
const flatAction = computed(() => props.advice?.metrics?.flat_action || '')

const advice = computed(() => props.advice)

const adviceClass = computed(() => {
  const hold = holdAction.value
  const flat = flatAction.value
  const buyKeywords = ['买入', '低吸', '加仓', '建仓', '布局']
  return buyKeywords.some(k => hold.includes(k) || flat.includes(k)) ? 'buy' : ''
})

const holdReasons = computed(() => props.advice?.metrics?.hold_reasons || [])
const flatReasons = computed(() => props.advice?.metrics?.flat_reasons || [])
</script>

<style scoped>
tr {
  font-weight: 600;
}
.code {
  color: #6b7280;
  font-size: 14px;
}
.name {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2937;
  font-size: 14px;
}
.gsz {
  font-variant-numeric: tabular-nums;
  font-size: 14px;
}
.chg {
  font-variant-numeric: tabular-nums;
  font-size: 14px;
}
.j {
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  color: #6b7280;
}
.phase {
  font-size: 14px;
  color: #6b7280;
}
.advice {
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
}
.reason {
  font-size: 14px;
  line-height: 1.5;
  color: #6b7280;
  max-width: 260px;
}
.time {
  font-size: 13px;
  color: #9ca3af;
}
.divider {
  color: #d1d5db;
  margin: 3px 0;
  font-size: 12px;
}
.positive {
  color: #dc2626;
}
.negative {
  color: #16a34a;
}
.buy {
  color: #4f46e5;
}
</style>