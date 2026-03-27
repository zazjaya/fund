<template>
  <div id="app">
    <Header :last-update="lastUpdate" />
    <IndexStrip :data="indexData" />
    <div class="container">
      <Toolbar
        v-model:key-value="keyValue"
        v-model:source-mode="sourceMode"
        :valid-key="validKey"
        :last-update="lastUpdate"
        :loading="loading"
        @refresh="loadData"
        @manage="showManageModal = true"
        @search="searchKeyword = $event"
      />
      <FundTable
        title="实时估值基金"
        :funds="filteredNormalFunds"
        :advice="adviceData"
        :loading="loading"
      />
      <FundTable
        title="上一交易日涨跌"
        :funds="filteredSpecialFunds"
        :advice="adviceData"
        :loading="loading"
        style="margin-top: 16px;"
      />
    </div>
    <FundManageModal
      v-if="showManageModal"
      :key-value="validKey"
      @close="showManageModal = false"
      @saved="onFundSaved"
    />
    <CustomAlert />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Header from './components/Header.vue'
import IndexStrip from './components/IndexStrip.vue'
import Toolbar from './components/Toolbar.vue'
import FundTable from './components/FundTable.vue'
import FundManageModal from './components/FundManageModal.vue'
import CustomAlert from './components/CustomAlert.vue'
import { useFunds } from './composables/useFunds'
import { useIndex } from './composables/useIndex'
import { useAdvice } from './composables/useAdvice'
import { useConfig } from './composables/useConfig'
import { useAuth } from './composables/useAuth'

// 状态
const keyValue = ref('')
const sourceMode = ref('auto')
const loading = ref(false)
const showManageModal = ref(false)
const validKey = ref('')
const lastUpdate = ref(null)
const searchKeyword = ref('')

// 组合式函数
const { fundCodes, fundGroups, loadConfig } = useConfig()
const { funds, loadFunds } = useFunds()
const { indexData, loadIndex } = useIndex()
const { adviceData, loadAdvice } = useAdvice()
const { validateKey: authValidateKey } = useAuth()

// 计算属性
const normalFunds = computed(() => funds.value.filter(f => f.GSZ != null))
const specialFunds = computed(() => funds.value.filter(f => f.GSZ == null))

// 搜索过滤
const filteredNormalFunds = computed(() => {
  if (!searchKeyword.value) return normalFunds.value
  const kw = searchKeyword.value.toLowerCase()
  return normalFunds.value.filter(f =>
    f.FCODE?.toLowerCase().includes(kw) ||
    f.SHORTNAME?.toLowerCase().includes(kw)
  )
})

const filteredSpecialFunds = computed(() => {
  if (!searchKeyword.value) return specialFunds.value
  const kw = searchKeyword.value.toLowerCase()
  return specialFunds.value.filter(f =>
    f.FCODE?.toLowerCase().includes(kw) ||
    f.SHORTNAME?.toLowerCase().includes(kw)
  )
})

// 方法
async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    const codes = getEffectiveCodes()
    await Promise.all([
      loadFunds(codes, sourceMode.value),
      loadIndex()
    ])
    await loadAdvice(codes)
    lastUpdate.value = new Date()
  } finally {
    loading.value = false
  }
}

function getEffectiveCodes() {
  if (validKey.value && fundGroups.value[validKey.value]) {
    return fundGroups.value[validKey.value]
  }
  return fundCodes.value
}

function onFundSaved() {
  loadConfig().then(loadData)
}

// 监听密钥变化
watch(keyValue, async (newKey) => {
  if (newKey) {
    const isValid = await authValidateKey(newKey, fundGroups.value)
    if (isValid) {
      validKey.value = newKey
      localStorage.setItem('fundMonitorValidKey', newKey)
      loadData()
    }
  } else {
    validKey.value = ''
    localStorage.removeItem('fundMonitorValidKey')
    loadData()
  }
})

// 初始化
onMounted(async () => {
  await loadConfig()

  // 恢复密钥
  const storedKey = localStorage.getItem('fundMonitorValidKey')
  if (storedKey) {
    keyValue.value = storedKey
    const isValid = await authValidateKey(storedKey, fundGroups.value)
    if (isValid) {
      validKey.value = storedKey
    }
  }

  loadData()
})
</script>

<style>
.container {
  padding: 24px 32px;
  max-width: 100%;
}
</style>