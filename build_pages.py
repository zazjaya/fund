#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_pages.py

把 fund_monitor.py 的页面“静态化”为 GitHub Pages 可用的 index.html：
- 在本地临时启动 fund_monitor.py HTTPServer
- 抓取关键接口 JSON（fund_codes / funds / index）
- 将原始 HTML 注入 window.fetch 拦截器：
  - 当页面请求 /api/* 时，直接返回抓取到的静态 JSON（以及 sparkline 的轻量占位数据）
  - 从而避免在 GitHub Pages 无法运行 Python 服务的情况下，页面无法加载的问题

输出：
- docs/index.html
"""

from __future__ import annotations

import json
import os
import random
import re
import socket
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


def _find_free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return int(port)


def _http_get_text(url: str, timeout: int = 30) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
        return raw.decode("utf-8", errors="replace")


def _http_get_json(url: str, timeout: int = 60, retries: int = 2) -> Any:
    last_err: Exception | None = None
    for attempt in range(1 + retries):
        try:
            text = _http_get_text(url, timeout=timeout)
            return json.loads(text)
        except Exception as e:
            last_err = e
            print(f"[WARN] attempt {attempt+1} failed for {url}: {e}")
            if attempt < retries:
                time.sleep(3)
    raise last_err  # type: ignore[misc]


def _http_get_json_or_fallback(url: str, fallback: Any, timeout: int = 180) -> Any:
    """Try to fetch JSON; return fallback on any failure (timeout, network, etc.)."""
    try:
        return _http_get_json(url, timeout=timeout, retries=2)
    except Exception as e:
        print(f"[WARN] using fallback for {url}: {e}")
        return fallback


def _wait_until_ok(base_url: str, timeout_s: int = 20) -> None:
    start = time.time()
    last_err: str = ""
    while time.time() - start < timeout_s:
        try:
            _ = _http_get_text(base_url + "/", timeout=5)
            return
        except Exception as e:
            last_err = str(e)
            time.sleep(0.5)
    raise RuntimeError("Local server not ready: " + last_err)


def _start_fund_server(port: int) -> threading.Thread:
    # fund_monitor.py 用全局变量，尽量在导入后调用其加载函数
    import fund_monitor as fm  # local module import

    fm.load_intraday_store()
    fm.load_fund_codes_from_file()
    fm.load_fund_groups_from_file()

    t = threading.Thread(
        target=fm.run_server,
        kwargs={"host": "127.0.0.1", "port": int(port)},
        daemon=True,
    )
    t.start()
    return t


def _inject_fetch_mock(
    html: str, *,
    fund_codes: list[Any], funds: list[dict[str, Any]], index: list[dict[str, Any]],
    advice: Any = None, fund_groups: Any = None,
) -> str:
    marker = "__PXF_FETCH_MOCK__"

    fund_codes_json = json.dumps(fund_codes, ensure_ascii=False)
    funds_json = json.dumps(funds, ensure_ascii=False)
    index_json = json.dumps(index, ensure_ascii=False)
    advice_json = json.dumps(advice or {}, ensure_ascii=False)
    fund_groups_json = json.dumps(fund_groups or {}, ensure_ascii=False)

    repo_root = os.path.dirname(os.path.abspath(__file__))
    live_fetch_path = os.path.join(repo_root, "live_fetch.js")
    with open(live_fetch_path, "r", encoding="utf-8") as f:
        live_fetch_js = f.read()

    # 拦截器策略：实时获取优先，静态数据兜底
    # 首屏（第一次 loadData）用静态数据保证快速渲染，后续刷新走实时外部 API
    mock_js = f"""
<script>
{live_fetch_js}
</script>
<script>
(function() {{
  window.{marker} = true;
  var STATIC = {{
    fund_codes: {fund_codes_json},
    funds: {funds_json},
    index: {index_json},
    advice: {advice_json},
    fund_groups: {fund_groups_json}
  }};

  // localStorage 管理基金：首次加载时初始化
  (function initLocalStorage() {{
    if (!localStorage.getItem("pxf_fund_codes")) {{
      localStorage.setItem("pxf_fund_codes", JSON.stringify(STATIC.fund_codes));
    }}
    if (!localStorage.getItem("pxf_fund_groups")) {{
      localStorage.setItem("pxf_fund_groups", JSON.stringify(STATIC.fund_groups));
    }}
    // 用 localStorage 覆盖 STATIC（用户可能已自定义）
    try {{
      var lsCodes = JSON.parse(localStorage.getItem("pxf_fund_codes"));
      if (Array.isArray(lsCodes) && lsCodes.length > 0) STATIC.fund_codes = lsCodes;
    }} catch(e) {{}}
    try {{
      var lsGroups = JSON.parse(localStorage.getItem("pxf_fund_groups"));
      if (lsGroups && typeof lsGroups === "object") STATIC.fund_groups = lsGroups;
    }} catch(e) {{}}
  }})();
  var _firstFundsLoad = true;
  var _firstIndexLoad = true;

  function jsonResp(data) {{
    return new Response(JSON.stringify(data), {{
      headers: {{"Content-Type":"application/json; charset=utf-8"}}
    }});
  }}

  function parsePath(input) {{
    var url = (typeof input === "string") ? input : (input && input.url ? input.url : String(input));
    var pathOnly = url;
    var full = url;
    try {{
      if (url.startsWith("http")) {{
        var u = new URL(url);
        pathOnly = u.pathname;
        full = u.pathname + (u.search || "");
      }} else {{
        var q = url.indexOf("?");
        pathOnly = q >= 0 ? url.slice(0, q) : url;
        full = url;
      }}
    }} catch(e) {{}}
    return {{ pathOnly: pathOnly, full: full }};
  }}

  function parseQS(full) {{
    var q = full.indexOf("?");
    if (q < 0) return {{}};
    var obj = {{}};
    full.slice(q+1).split("&").forEach(function(p) {{
      var kv = p.split("=");
      obj[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]||"");
    }});
    return obj;
  }}

  var LF = window.__liveFetch;

  window.fetch = async function(input, init) {{
    var p = parsePath(input);
    var pathOnly = p.pathOnly;
    var full = p.full;
    var qs = parseQS(full);
    var method = (init && init.method) ? init.method.toUpperCase() : "GET";

    // POST /api/fund_codes — localStorage 存储（响应格式与 Python 一致）
    if (pathOnly === "/api/fund_codes" && method === "POST") {{
      try {{
        var body = (init && init.body) ? JSON.parse(init.body) : {{}};
        if (body.codes && Array.isArray(body.codes)) {{
          var validCodes = body.codes.filter(function(c) {{
            var s = String(c).trim();
            return s && /^[0-9]{{6}}$/.test(s);
          }}).map(function(c) {{ return String(c).trim(); }});
          if (validCodes.length > 0) STATIC.fund_codes = validCodes;
          localStorage.setItem("pxf_fund_codes", JSON.stringify(STATIC.fund_codes));
          return jsonResp({{ codes: STATIC.fund_codes }});
        }}
      }} catch(e) {{ console.warn("POST fund_codes error:", e); }}
      return jsonResp({{ codes: STATIC.fund_codes }});
    }}

    // POST /api/fund_groups — localStorage 存储（响应格式与 Python 一致）
    if (pathOnly === "/api/fund_groups" && method === "POST") {{
      try {{
        var body = (init && init.body) ? JSON.parse(init.body) : {{}};
        var groups = STATIC.fund_groups || {{}};
        var key = (body.key || "").trim();
        if (key) {{
          var inCodes = (body.codes || []).filter(function(c) {{
            var s = String(c).trim();
            return s && /^[0-9]{{6}}$/.test(s);
          }}).map(function(c) {{ return String(c).trim(); }});
          if (inCodes.length > 0) {{
            groups[key] = inCodes;
          }} else if (groups[key]) {{
            delete groups[key];
          }}
          STATIC.fund_groups = groups;
          localStorage.setItem("pxf_fund_groups", JSON.stringify(groups));
          return jsonResp({{ key: key, codes: groups[key] || [] }});
        }}
      }} catch(e) {{ console.warn("POST fund_groups error:", e); }}
      return jsonResp({{ key: "", codes: [] }});
    }}

    // GET /api/fund_codes
    if (pathOnly === "/api/fund_codes") {{
      return jsonResp(STATIC.fund_codes);
    }}

    // /api/funds — 核心：首次用静态（快速首屏），后续用实时
    if (pathOnly === "/api/funds") {{
      // 确定本次请求要用的基金代码列表（密钥过滤）
      var codesForRequest = STATIC.fund_codes;
      if (qs.key) {{
        var grp = (STATIC.fund_groups || {{}})[qs.key];
        if (Array.isArray(grp) && grp.length > 0) codesForRequest = grp;
      }}
      if (_firstFundsLoad) {{
        _firstFundsLoad = false;
        // 首次加载：如果带 key 过滤，从静态数据中筛选
        if (qs.key) {{
          var keySet = new Set(codesForRequest);
          return jsonResp(STATIC.funds.filter(function(f) {{ return keySet.has(f.FCODE); }}));
        }}
        return jsonResp(STATIC.funds);
      }}
      if (LF) {{
        try {{
          var liveData = await LF.fetchFundsLive(codesForRequest, qs.mode || "auto");
          if (liveData && liveData.length > 0) return jsonResp(liveData);
        }} catch(e) {{ console.warn("[live_fetch] funds failed, fallback to static:", e); }}
      }}
      // fallback: 静态数据（带 key 过滤）
      if (qs.key) {{
        var keySet2 = new Set(codesForRequest);
        return jsonResp(STATIC.funds.filter(function(f) {{ return keySet2.has(f.FCODE); }}));
      }}
      return jsonResp(STATIC.funds);
    }}

    // /api/index — 首次静态，后续实时
    if (pathOnly === "/api/index") {{
      if (_firstIndexLoad) {{
        _firstIndexLoad = false;
        return jsonResp(STATIC.index);
      }}
      if (LF) {{
        try {{
          var liveIdx = await LF.fetchIndexLive();
          if (liveIdx && liveIdx.length > 0) return jsonResp(liveIdx);
        }} catch(e) {{ console.warn("[live_fetch] index failed, fallback to static:", e); }}
      }}
      return jsonResp(STATIC.index);
    }}

    // /api/sparkline/* — 实时获取净值趋势
    if (pathOnly === "/api/sparkline/nav" || pathOnly === "/api/sparkline/intraday") {{
      if (LF && qs.code) {{
        try {{
          var sp = await LF.fetchSparklineNav(qs.code, parseInt(qs.points)||60);
          if (sp) return jsonResp(sp);
        }} catch(e) {{}}
      }}
      return jsonResp({{ points: [1, 2] }});
    }}
    if (pathOnly === "/api/sparkline/nav/daily") {{
      if (LF && qs.code) {{
        try {{
          var spd = await LF.fetchSparklineDaily3M(qs.code, parseInt(qs.points)||60);
          if (spd) return jsonResp(spd);
        }} catch(e) {{}}
      }}
      return jsonResp({{ points: [1, 2] }});
    }}
    if (pathOnly === "/api/sparkline/nav/weekly") {{
      if (LF && qs.code) {{
        try {{
          var spw = await LF.fetchSparklineWeekly1Y(qs.code, parseInt(qs.points)||60);
          if (spw) return jsonResp(spw);
        }} catch(e) {{}}
      }}
      return jsonResp({{ points: [1, 2] }});
    }}

    // /api/kdj — 实时计算
    if (pathOnly === "/api/kdj") {{
      if (LF && qs.code) {{
        try {{
          var kdjData = await LF.fetchKDJ(qs.code);
          if (kdjData) return jsonResp(kdjData);
        }} catch(e) {{}}
      }}
      return jsonResp({{}});
    }}

    // /api/advice — 返回预抓取数据（含 J值/阶段/建议/原因）
    if (pathOnly === "/api/advice" || pathOnly === "/api/advice/") {{
      // 如果请求带 codes=xxx,yyy 参数，过滤返回
      if (qs.codes && STATIC.advice && typeof STATIC.advice === "object") {{
        var reqCodes = qs.codes.split(",");
        var filtered = {{}};
        reqCodes.forEach(function(c) {{ if (STATIC.advice[c]) filtered[c] = STATIC.advice[c]; }});
        return jsonResp(filtered);
      }}
      if (qs.code && STATIC.advice && STATIC.advice[qs.code]) {{
        return jsonResp(STATIC.advice[qs.code]);
      }}
      return jsonResp(STATIC.advice || {{}});
    }}

    // /api/fund_groups — localStorage 支持
    if (pathOnly === "/api/fund_groups") {{
      if (qs.key) {{
        var groups = STATIC.fund_groups || {{}};
        return jsonResp(groups[qs.key] || []);
      }}
      return jsonResp(STATIC.fund_groups || {{}});
    }}
    if (pathOnly === "/api/log") return jsonResp({{}});

    // 未命中的 /api/* 返回空对象
    if (pathOnly.startsWith("/api/")) return jsonResp({{}});

    throw new Error("PXF: no handler for " + full);
  }};
}})();
</script>
""".strip()

    out, n = re.subn(r"<script>", mock_js + "\n<script>", html, count=1)
    if n != 1:
        raise RuntimeError("Failed to inject fetch mock: cannot find <script> tag")
    if marker not in out:
        raise RuntimeError("Fetch mock marker not found after injection")
    return out


def main() -> None:
    repo_root = os.path.dirname(os.path.abspath(__file__))
    docs_dir = os.path.join(repo_root, "docs")
    os.makedirs(docs_dir, exist_ok=True)

    port = _find_free_port()
    base_url = f"http://127.0.0.1:{port}"

    _start_fund_server(port)
    _wait_until_ok(base_url)

    # 抓取“首屏必需”的数据
    fund_codes = _http_get_json(base_url + "/api/fund_codes", timeout=30)
    funds = _http_get_json_or_fallback(base_url + "/api/funds?mode=auto", fallback=[])
    index = _http_get_json_or_fallback(base_url + "/api/index", fallback=[])
    advice = _http_get_json_or_fallback(base_url + "/api/advice", fallback={}, timeout=300)
    fund_groups = _http_get_json_or_fallback(base_url + "/api/fund_groups", fallback={})

    # 获取原始 HTML
    html = _http_get_text(base_url + "/")

    # 注入 fetch mock
    html_out = _inject_fetch_mock(
        html, fund_codes=fund_codes, funds=funds, index=index,
        advice=advice, fund_groups=fund_groups,
    )

    out_path = os.path.join(docs_dir, "index.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html_out)

    print("OK: generated", out_path, "size=", len(html_out))


if __name__ == "__main__":
    main()

