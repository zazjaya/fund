<template>
  <div>
    <div class="sub-section-title">{{ title }}</div>
    <table class="fund-table">
      <thead>
        <tr>
          <th @click="sortBy('FCODE')">代码</th>
          <th @click="sortBy('SHORTNAME')">名称</th>
          <th @click="sortBy('GSZ')">估算净值</th>
          <th @click="sortBy('GSZZL')">估算涨跌</th>
          <th>J(日)</th>
          <th>阶段</th>
          <th>建议</th>
          <th>原因</th>
          <th @click="sortBy('GZTIME')">更新时间</th>
        </tr>
      </thead>
      <tbody>
        <FundRow
          v-for="fund in sortedFunds"
          :key="fund.FCODE"
          :fund="fund"
          :advice="advice[fund.FCODE]"
        />
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import FundRow from './FundRow.vue'

/**
 * 基金数据表格组件
 */
const props = defineProps({
  title: { type: String, default: '' },
  funds: { type: Array, default: () => [] },
  advice: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false }
})

const sortKey = ref(null)
const sortAsc = ref(true)

function sortBy(key) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

/**
 * 获取基金的涨跌值（用于排序）
 */
function getChangeValue(fund) {
  if (fund.GSZ != null && fund.GSZZL != null) {
    return parseFloat(fund.GSZZL)
  }
  if (fund.LAST_CHG != null) {
    return parseFloat(fund.LAST_CHG)
  }
  return null
}

const sortedFunds = computed(() => {
  // 默认按涨跌排序（降序）
  if (!sortKey.value) {
    return [...props.funds].sort((a, b) => {
      const va = getChangeValue(a)
      const vb = getChangeValue(b)
      if (va == null) return 1
      if (vb == null) return -1
      return vb - va
    })
  }

  // 按估算涨跌排序时，使用综合值
  if (sortKey.value === 'GSZZL') {
    return [...props.funds].sort((a, b) => {
      const va = getChangeValue(a)
      const vb = getChangeValue(b)
      if (va == null) return 1
      if (vb == null) return -1
      return sortAsc.value ? va - vb : vb - va
    })
  }

  return [...props.funds].sort((a, b) => {
    const va = a[sortKey.value]
    const vb = b[sortKey.value]
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1

    const na = parseFloat(va)
    const nb = parseFloat(vb)
    if (!isNaN(na) && !isNaN(nb)) {
      return sortAsc.value ? na - nb : nb - na
    }
    return sortAsc.value
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va))
  })
})
</script>