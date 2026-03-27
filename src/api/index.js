/**
 * 指数数据 API
 */

const INDEX_SECIDS = [
  '1.000001',  // 上证指数
  '1.000300',  // 沪深300
  '0.399001',  // 深证成指
  '0.399006'   // 创业板指
]

function safeFloat(v) {
  if (v == null || v === '' || v === '--') return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

/**
 * 获取指数快照
 */
export async function fetchIndexLive() {
  const url =
    'https://push2.eastmoney.com/api/qt/ulist.np/get' +
    '?fltt=2&secids=' + encodeURIComponent(INDEX_SECIDS.join(',')) +
    '&fields=f2,f3,f4,f12,f14'

  const res = await fetch(url)
  const obj = await res.json()
  const out = []
  const datas = ((obj && obj.data) || {}).diff || []

  datas.forEach(it => {
    if (!it) return
    out.push({
      code: String(it.f12 || ''),
      name: String(it.f14 || ''),
      last: safeFloat(it.f2),
      chg: safeFloat(it.f4),
      pct: safeFloat(it.f3)
    })
  })

  return out
}