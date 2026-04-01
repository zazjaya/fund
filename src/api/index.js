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
 * 获取指数快照（JSONP方式）
 */
export async function fetchIndexLive() {
  return new Promise((resolve, reject) => {
    const callback = 'jsonp_index_' + Date.now() + '_' + Math.random().toString(36).slice(2)
    const url =
      'https://push2.eastmoney.com/api/qt/ulist.np/get' +
      '?fltt=2&secids=' + encodeURIComponent(INDEX_SECIDS.join(',')) +
      '&fields=f2,f3,f4,f12,f14' +
      '&cb=' + callback

    const timer = setTimeout(() => {
      delete window[callback]
      if (script.parentNode) document.head.removeChild(script)
      reject(new Error('timeout'))
    }, 10000)

    window[callback] = (obj) => {
      clearTimeout(timer)
      delete window[callback]
      if (script.parentNode) document.head.removeChild(script)

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

      resolve(out)
    }

    const script = document.createElement('script')
    script.src = url
    script.onerror = () => {
      clearTimeout(timer)
      delete window[callback]
      if (script.parentNode) document.head.removeChild(script)
      reject(new Error('script load error'))
    }
    document.head.appendChild(script)
  })
}