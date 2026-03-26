/**
 * live_fetch.js — 浏览器端直接调用外部基金 API 获取实时数据
 *
 * 对应 fund_monitor.py 的核心数据获取函数，在 GitHub Pages 环境下
 * 无需 Python 后端即可拿到实时基金估值、指数快照、净值趋势等数据。
 *
 * API 兼容性（已测试）：
 *   fundmobapi.eastmoney.com   → CORS: *            → 直接 fetch
 *   push2.eastmoney.com        → CORS: 精确 origin  → 直接 fetch
 *   push2his.eastmoney.com     → CORS: 精确 origin  → 直接 fetch
 *   fundgz.1234567.com.cn      → JSONP (jsonpgz)    → script 注入
 *   fund.eastmoney.com/pingzhongdata → JS 文件       → script 注入
 */
(function () {
  "use strict";
  if (window.__LIVE_FETCH_LOADED__) return;
  window.__LIVE_FETCH_LOADED__ = true;

  const TIMEOUT_MS = 15000;

  // ===== Helpers =====

  function fetchJSON(url, timeoutMs) {
    timeoutMs = timeoutMs || TIMEOUT_MS;
    return new Promise(function (resolve, reject) {
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (ctrl) ctrl.abort();
        reject(new Error("timeout"));
      }, timeoutMs);
      fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: ctrl ? ctrl.signal : undefined,
      })
        .then(function (r) { return r.json(); })
        .then(function (d) { clearTimeout(timer); resolve(d); })
        .catch(function (e) { clearTimeout(timer); reject(e); });
    });
  }

  var _jsonpId = 0;
  function jsonpFetch(url, callbackParam, callbackName) {
    callbackParam = callbackParam || "callback";
    return new Promise(function (resolve, reject) {
      var id = "__jsonp_" + (++_jsonpId) + "_" + Date.now();
      var cbName = callbackName || id;
      var timer = setTimeout(function () {
        cleanup();
        reject(new Error("jsonp timeout"));
      }, TIMEOUT_MS);

      window[cbName] = function (data) {
        clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      var script = document.createElement("script");
      var sep = url.indexOf("?") >= 0 ? "&" : "?";
      script.src = url + (callbackName ? "" : sep + callbackParam + "=" + cbName);
      script.onerror = function () {
        clearTimeout(timer);
        cleanup();
        reject(new Error("jsonp script error"));
      };
      document.head.appendChild(script);

      function cleanup() {
        try { document.head.removeChild(script); } catch (e) {}
        try { delete window[cbName]; } catch (e) {}
      }
    });
  }

  function loadExternalJS(url) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error("script timeout"));
      }, TIMEOUT_MS);
      var script = document.createElement("script");
      script.src = url;
      script.onload = function () {
        clearTimeout(timer);
        try { document.head.removeChild(script); } catch (e) {}
        resolve();
      };
      script.onerror = function () {
        clearTimeout(timer);
        try { document.head.removeChild(script); } catch (e) {}
        reject(new Error("script load error"));
      };
      document.head.appendChild(script);
    });
  }

  function safeFloat(v) {
    if (v == null || v === "" || v === "--") return null;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  // ===== Core Fetch Functions =====

  /**
   * 批量实时估值 — 东财 FundMNFInfo (CORS: *)
   * 对应 fund_monitor.py fetch_realtime_batch
   */
  function fetchRealtimeBatch(codes) {
    if (!codes || !codes.length) return Promise.resolve({});
    var url =
      "https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo" +
      "?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1" +
      "&deviceid=Wap&Fcodes=" + encodeURIComponent(codes.join(","));
    return fetchJSON(url).then(function (data) {
      var map = {};
      var datas = (data && data.Datas) || [];
      datas.forEach(function (item) {
        if (!item || !item.FCODE) return;
        map[item.FCODE] = {
          FCODE: item.FCODE,
          SHORTNAME: item.SHORTNAME || "",
          GSZ: safeFloat(item.GSZ),
          GSZZL: safeFloat(item.GSZZL),
          DWJZ: safeFloat(item.NAV),
          GZTIME: item.GZTIME || "",
          PDATE: item.PDATE || "",
        };
      });
      return map;
    });
  }

  /**
   * 单只 JSONP 估值 — fundgz.1234567.com.cn
   * 对应 fund_monitor.py fetch_realtime_single_fundgz
   */
  function fetchSingleFundgz(code) {
    var url =
      "https://fundgz.1234567.com.cn/js/" +
      encodeURIComponent(code) + ".js?rt=" + Date.now();
    return jsonpFetch(url, null, "jsonpgz").then(function (obj) {
      return {
        FCODE: obj.fundcode || code,
        SHORTNAME: obj.name || "",
        GSZ: safeFloat(obj.gsz),
        GSZZL: safeFloat(obj.gszzl),
        DWJZ: safeFloat(obj.dwjz),
        GZTIME: obj.gztime || "",
      };
    });
  }

  /**
   * 批量 + 单只补齐（auto 模式）
   * 对应 fund_monitor.py fetch_realtime_auto
   */
  function fetchRealtimeAuto(codes) {
    return fetchRealtimeBatch(codes).then(function (batchMap) {
      var missing = [];
      codes.forEach(function (c) {
        var info = batchMap[c];
        if (!info || info.GSZ == null) missing.push(c);
      });
      if (!missing.length) return batchMap;
      var promises = missing.map(function (c) {
        return fetchSingleFundgz(c)
          .then(function (r) { batchMap[c] = r; })
          .catch(function () {});
      });
      return Promise.all(promises).then(function () { return batchMap; });
    });
  }

  /**
   * 获取基金数据列表（对应 /api/funds 返回格式）
   * 对应 fund_monitor.py get_fund_data
   */
  function fetchFundsLive(fundCodes, mode) {
    mode = mode || "auto";
    return fetchRealtimeAuto(fundCodes).then(function (batchMap) {
      var results = [];
      fundCodes.forEach(function (code) {
        var info = batchMap[code];
        if (info) {
          results.push(info);
        } else {
          results.push({
            FCODE: code,
            SHORTNAME: "",
            GSZ: null,
            GSZZL: null,
            GZTIME: "--",
            LAST_CHG: null,
          });
        }
      });
      return results;
    });
  }

  /**
   * 指数快照 — push2.eastmoney.com (CORS: origin match)
   * 对应 fund_monitor.py get_index_snapshot
   */
  var INDEX_SECIDS = ["1.000001", "0.399001", "0.399006", "1.000300", "1.000016", "1.000905"];
  function fetchIndexLive() {
    var url =
      "https://push2.eastmoney.com/api/qt/ulist.np/get" +
      "?fltt=2&secids=" + encodeURIComponent(INDEX_SECIDS.join(",")) +
      "&fields=f2,f3,f4,f12,f14";
    return fetchJSON(url).then(function (obj) {
      var out = [];
      var datas = ((obj && obj.data) || {}).diff || [];
      datas.forEach(function (it) {
        if (!it) return;
        out.push({
          code: String(it.f12 || ""),
          name: String(it.f14 || ""),
          last: safeFloat(it.f2),
          chg: safeFloat(it.f4),
          pct: safeFloat(it.f3),
        });
      });
      return out;
    });
  }

  /**
   * 净值趋势 sparkline — pingzhongdata (JS 文件，script 注入)
   * 对应 fund_monitor.py get_nav_sparkline_points / daily / weekly
   */
  function fetchPingzhongdata(code) {
    var url = "https://fund.eastmoney.com/pingzhongdata/" + encodeURIComponent(code) + ".js?v=" + Date.now();
    var prevName = window.fS_name;
    var prevTrend = window.Data_netWorthTrend;
    window.fS_name = undefined;
    window.Data_netWorthTrend = undefined;
    return loadExternalJS(url).then(function () {
      var name = window.fS_name || "--";
      var trend = window.Data_netWorthTrend || [];
      window.fS_name = prevName;
      window.Data_netWorthTrend = prevTrend;
      return { name: name, trend: trend };
    });
  }

  function parseSparklinePoints(trend, tailN) {
    tailN = tailN || 60;
    if (!Array.isArray(trend) || !trend.length) return null;
    var slice = trend.length > tailN ? trend.slice(-tailN) : trend;
    var ys = [];
    var lastDate = "--";
    slice.forEach(function (item) {
      var y = safeFloat(item.y);
      if (y == null) return;
      ys.push(y);
      if (item.x) {
        try { lastDate = new Date(item.x).toISOString().slice(0, 10); } catch (e) {}
      }
    });
    return ys.length >= 2 ? { points: ys, date: lastDate } : null;
  }

  function fetchSparklineNav(code, points) {
    points = points || 60;
    return fetchPingzhongdata(code).then(function (d) {
      var sp = parseSparklinePoints(d.trend, points);
      if (!sp) return null;
      sp.code = code;
      sp.name = d.name;
      return sp;
    });
  }

  function fetchSparklineDaily3M(code, points) {
    points = points || 60;
    return fetchPingzhongdata(code).then(function (d) {
      if (!d.trend || !d.trend.length) return null;
      var cutMs = Date.now() - 92 * 86400000;
      var daily = d.trend.filter(function (it) { return it.x >= cutMs; });
      if (daily.length < 2) daily = d.trend;
      var tail = daily.length > points ? daily.slice(-points) : daily;
      var ys = [];
      tail.forEach(function (it) { var y = safeFloat(it.y); if (y != null) ys.push(y); });
      if (ys.length < 2) return null;
      return { code: code, name: d.name, points: ys, freq: "D" };
    });
  }

  function fetchSparklineWeekly1Y(code, points) {
    points = points || 60;
    return fetchPingzhongdata(code).then(function (d) {
      if (!d.trend || !d.trend.length) return null;
      var cutMs = Date.now() - 370 * 86400000;
      var daily = d.trend.filter(function (it) { return it.x >= cutMs; });
      var buckets = {};
      (daily.length >= 2 ? daily : d.trend).forEach(function (it) {
        var dt = new Date(it.x);
        var y = safeFloat(it.y);
        if (y == null) return;
        var jan4 = new Date(dt.getFullYear(), 0, 4);
        var week = Math.ceil(((dt - jan4) / 86400000 + jan4.getDay() + 1) / 7);
        var key = dt.getFullYear() + "-W" + week;
        buckets[key] = y;
      });
      var ys = Object.keys(buckets).sort().map(function (k) { return buckets[k]; });
      if (ys.length > points) ys = ys.slice(-points);
      if (ys.length < 2) return null;
      return { code: code, name: d.name, points: ys, freq: "W" };
    });
  }

  /**
   * KDJ — 基于 pingzhongdata 净值序列计算 J 值
   */
  function calcKDJ(closes, period) {
    period = period || 9;
    if (!closes || closes.length < period) return [];
    var k = 50, d = 50;
    var result = [];
    for (var i = 0; i < closes.length; i++) {
      var windowSlice = closes.slice(Math.max(0, i - period + 1), i + 1);
      var high = Math.max.apply(null, windowSlice);
      var low = Math.min.apply(null, windowSlice);
      var rsv = high === low ? 50 : ((closes[i] - low) / (high - low)) * 100;
      k = 2 / 3 * k + 1 / 3 * rsv;
      d = 2 / 3 * d + 1 / 3 * k;
      var j = 3 * k - 2 * d;
      result.push({ k: k, d: d, j: j });
    }
    return result;
  }

  function fetchKDJ(code) {
    return fetchPingzhongdata(code).then(function (d) {
      if (!d.trend || d.trend.length < 10) return {};
      var cutDay = Date.now() - 92 * 86400000;
      var cutWeek = Date.now() - 370 * 86400000;
      var daily = d.trend.filter(function (it) { return it.x >= cutDay; });
      if (daily.length < 10) daily = d.trend;
      var dailyCloses = daily.map(function (it) { return safeFloat(it.y); }).filter(function (v) { return v != null; });
      var dailyKDJ = calcKDJ(dailyCloses);
      var jDaily = dailyKDJ.length ? dailyKDJ[dailyKDJ.length - 1].j : null;

      var weeklyData = d.trend.filter(function (it) { return it.x >= cutWeek; });
      if (weeklyData.length < 10) weeklyData = d.trend;
      var buckets = {};
      weeklyData.forEach(function (it) {
        var dt = new Date(it.x);
        var y = safeFloat(it.y);
        if (y == null) return;
        var jan4 = new Date(dt.getFullYear(), 0, 4);
        var week = Math.ceil(((dt - jan4) / 86400000 + jan4.getDay() + 1) / 7);
        var key = dt.getFullYear() + "-W" + week;
        buckets[key] = y;
      });
      var weeklyCloses = Object.keys(buckets).sort().map(function (k) { return buckets[k]; });
      var weeklyKDJ = calcKDJ(weeklyCloses);
      var jWeekly = weeklyKDJ.length ? weeklyKDJ[weeklyKDJ.length - 1].j : null;

      return { code: code, name: d.name, j_daily: jDaily, j_weekly: jWeekly };
    });
  }

  // ===== Expose =====
  window.__liveFetch = {
    fetchFundsLive: fetchFundsLive,
    fetchIndexLive: fetchIndexLive,
    fetchSparklineNav: fetchSparklineNav,
    fetchSparklineDaily3M: fetchSparklineDaily3M,
    fetchSparklineWeekly1Y: fetchSparklineWeekly1Y,
    fetchKDJ: fetchKDJ,
    fetchRealtimeBatch: fetchRealtimeBatch,
    fetchSingleFundgz: fetchSingleFundgz,
  };
})();
