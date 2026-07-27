#!/usr/bin/env python3
"""
=========================================================================
  新增歌手标准化流水线  add_singer.py
=========================================================================
  一键完成：QQ音乐取歌 → 网易云匹配nid → QQ音乐取封面 → 生成JS → 构建HTML

  用法:
    python3 add_singer.py --name "周杰伦" --mid 0025NhlN2yWrP4 --key jay \\
                          --en "JAY" --icon '🎵' --size 128

  参数:
    --name   歌手中文名（必填）
    --mid    QQ音乐 singerMid（必填，从 y.qq.com 歌手页 URL 获取）
    --key    歌手英文key，用于 singers.js 中的变量前缀和 SINGERS key（必填）
    --en     歌手英文名缩写，用于 nameEn 字段（必填）
    --icon   歌手图标 emoji（可选，默认 🎤）
    --size   对阵规模 64 或 128（可选，默认 128）

  示例:
    # 林俊杰
    python3 add_singer.py --name "林俊杰" --mid 001BLpXF2DyJe2 --key jj \\
                          --en "JJ" --icon '🎶' --size 128

    # 周杰伦
    python3 add_singer.py --name "周杰伦" --mid 0025NhlN2yWrP4 --key jay \\
                          --en "JAY" --icon '🎵' --size 128

  步骤:
    1. 从 QQ 音乐获取歌手歌曲列表（按收藏量排序）
    2. 逐首匹配网易云歌曲 ID (nid) 用于音频播放
    3. 从 QQ 音乐获取每首歌的专辑封面 URL
    4. 生成 JS 数据数组并写入 singers.js
    5. 构建 React 应用并生成单文件 HTML
=========================================================================
"""

import argparse, json, urllib.request, urllib.parse, time, re, os, sys

# ========================================================================
#  配置
# ========================================================================
SINGERS_JS = '/workspace/stefanie-song-worldcup-react/src/data/singers.js'
PROJECT_DIR = '/workspace/stefanie-song-worldcup-react'
WORK_DIR = '/data/user/work'
HTML_OUTPUT = '/workspace/song-worldcup.html'

HEADERS_QQ = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://y.qq.com/'}
HEADERS_NE = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://music.163.com/'}

# ========================================================================
#  工具函数
# ========================================================================
def http_get(url, headers, timeout=10):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode('utf-8')
    except Exception as e:
        return None

def normalize(name):
    """标准化歌名用于去重和匹配"""
    s = re.sub(r'[\s（\(（【\[].*$', '', name)  # 去括号后缀
    s = re.sub(r'[（\(（【\[\]\)）】]', '', s)
    return s.lower().strip()

def normalize_strict(name):
    """严格标准化（用于网易云精确匹配）"""
    s = re.sub(r'\s*\(.*?\)\s*', '', name)
    s = re.sub(r'\s*（.*?）\s*', '', s)
    s = re.sub(r'\s*feat\..*$', '', s, flags=re.I)
    s = re.sub(r'\s*feat .*$', '', s, flags=re.I)
    return s.lower().strip()

# ========================================================================
#  Step 1: QQ 音乐 — 获取歌手歌曲列表（按收藏量排序）
# ========================================================================
def qq_fetch_songs(singer_mid, count=128):
    """从 QQ 音乐获取歌手歌曲列表，按收藏量降序"""
    print(f"\n{'='*60}")
    print(f"Step 1: 从 QQ 音乐获取歌曲列表 (singerMid={singer_mid}, 需要 {count} 首)")
    print(f"{'='*60}")

    all_songs = []
    page = 1
    per_page = 50

    while len(all_songs) < count + 20:  # 多取一些用于过滤
        url = (f"https://c.y.qq.com/v8/fcg-bin/fcg_v8_singer_track_spg.fcg"
               f"?singermid={singer_mid}&order=listen&begin={(page-1)*per_page}"
               f"&num={per_page}&songstatus=1&format=json")
        text = http_get(url, HEADERS_QQ, timeout=15)
        if not text:
            print(f"  第 {page} 页请求失败")
            break
        try:
            data = json.loads(text)
        except:
            print(f"  第 {page} 页解析失败")
            break

        list_data = data.get("data", {}).get("list", [])
        if not list_data:
            break

        for item in list_data:
            song = item.get("song", {})
            name = song.get("name", "").strip()
            mid = song.get("mid", "")
            song_id = song.get("id", 0)
            if name and mid:
                all_songs.append({"name": name, "mid": mid, "id": song_id})

        print(f"  第 {page} 页: 累计 {len(all_songs)} 首")
        page += 1
        time.sleep(0.5)
        if page > 10:
            break

    # 过滤现场版/伴奏等
    filtered = []
    seen = set()
    for s in all_songs:
        norm = normalize(s["name"])
        if norm in seen:
            continue
        if re.search(r'(live|现场|演唱会|伴奏|karaoke|instrumental|纯音乐|remix|DJ|demo|DEMO)', s["name"], re.I):
            continue
        seen.add(norm)
        filtered.append(s)

    result = filtered[:count]
    print(f"\n获取 {len(all_songs)} 首 → 过滤后 {len(filtered)} 首 → 取前 {len(result)} 首")
    if len(result) < count:
        print(f"  ⚠ 警告: 只找到 {len(result)} 首，不足 {count} 首！")
    return result

# ========================================================================
#  Step 2: 网易云 — 匹配歌曲 nid（用于音频播放）
# ========================================================================
def ne_search_song(query, limit=5):
    """网易云搜索歌曲"""
    url = f"https://music.163.com/api/search/get?s={urllib.parse.quote(query)}&limit={limit}&type=1"
    text = http_get(url, HEADERS_NE, timeout=8)
    if not text:
        return []
    try:
        data = json.loads(text)
        return data.get("result", {}).get("songs", [])
    except:
        return []

def match_nids(songs, singer_name):
    """为每首歌匹配网易云 nid"""
    print(f"\n{'='*60}")
    print(f"Step 2: 匹配网易云 nid（用于音频播放）")
    print(f"{'='*60}")

    nids = []
    found = 0

    for i, song in enumerate(songs):
        name = song["name"]
        query = f"{singer_name} {name}"
        results = ne_search_song(query, 5)

        nid = None
        norm_target = normalize_strict(name)

        for s in results:
            artists = s.get("artists", [])
            artist_names = [a.get("name", "") for a in artists]
            if not any(singer_name in an for an in artist_names):
                continue
            sname = s.get("name", "")
            norm_found = normalize_strict(sname)
            if norm_target == norm_found:
                nid = s.get("id")
                break

        nids.append(nid)
        if nid:
            found += 1
        else:
            # 宽松匹配
            for s in results:
                artists = s.get("artists", [])
                artist_names = [a.get("name", "") for a in artists]
                if not any(singer_name in an for an in artist_names):
                    continue
                sname = s.get("name", "")
                if norm_target in normalize_strict(sname) or normalize_strict(sname) in norm_target:
                    nid = s.get("id")
                    nids[-1] = nid
                    found += 1
                    break

        if (i + 1) % 10 == 0:
            print(f"  [{i+1}/{len(songs)}] 已匹配 {found} 首")
        time.sleep(0.2)

    print(f"\n匹配完成: {found}/{len(songs)} 首有 nid")
    missing = [(i, songs[i]["name"]) for i, n in enumerate(nids) if n is None]
    if missing:
        print(f"  缺失 nid 的歌曲 ({len(missing)} 首):")
        for idx, name in missing:
            print(f"    #{idx+1} {name}")
    return nids

# ========================================================================
#  Step 3: QQ 音乐 — 获取专辑封面
# ========================================================================
def qq_fetch_pics(songs):
    """从 QQ 音乐获取每首歌的专辑封面 URL"""
    print(f"\n{'='*60}")
    print(f"Step 3: 获取 QQ 音乐专辑封面")
    print(f"{'='*60}")

    pics = []
    found = 0

    for i, song in enumerate(songs):
        mid = song["mid"]
        url = f"https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?songmid={mid}&format=json"
        text = http_get(url, HEADERS_QQ, timeout=10)

        pic_url = ""
        if text:
            try:
                data = json.loads(text)
                items = data.get("data", [])
                if items:
                    album_mid = items[0].get("album", {}).get("mid", "")
                    if album_mid:
                        pic_url = f"https://y.gtimg.cn/music/photo_new/T002R300x300M000{album_mid}.jpg"
            except:
                pass

        pics.append(pic_url)
        if pic_url:
            found += 1

        if (i + 1) % 20 == 0:
            print(f"  [{i+1}/{len(songs)}] 已获取 {found} 张封面")
        time.sleep(0.15)

    print(f"\n封面获取完成: {found}/{len(songs)}")
    missing = [(i, songs[i]["name"]) for i, p in enumerate(pics) if not p]
    if missing:
        print(f"  缺失封面的歌曲 ({len(missing)} 首):")
        for idx, name in missing:
            print(f"    #{idx+1} {name}")
    return pics

# ========================================================================
#  Step 4: 生成 JS 数据并写入 singers.js
# ========================================================================
def generate_js(singer_key, singer_name, singer_en, icon, size, songs, nids, pics):
    """生成 JS 代码并更新 singers.js（幂等操作，可重复执行）"""
    print(f"\n{'='*60}")
    print(f"Step 4: 生成 JS 数据并更新 singers.js")
    print(f"{'='*60}")

    half = size // 2
    left = [s["name"] for s in songs[:half]]
    right = [s["name"] for s in songs[half:size]]

    # 确保数组长度正确
    while len(left) < half:
        left.append(f"待补充{len(left)}")
    while len(right) < half:
        right.append(f"待补充{len(right)}")
    while len(nids) < size:
        nids.append(None)
    while len(pics) < size:
        pics.append("")

    prefix = singer_key.upper()
    var_left = f"{prefix}_LEFT"
    var_right = f"{prefix}_RIGHT"
    var_nids = f"{prefix}_NIDS"
    var_pics = f"{prefix}_PICS"
    var_chorus = f"{prefix}_CHORUS"
    var_entrants = f"{prefix}_ENTRANTS"

    # 读取现有 singers.js
    with open(SINGERS_JS, 'r', encoding='utf-8') as f:
        content = f.read()

    # ---- 0. 提取已有的 chorus 数据（按歌名保留，避免重跑丢失）----
    new_chorus = {}
    chorus_line_re = rf'const {re.escape(var_chorus)}\s*=\s*\{{([^}}]*)\}}'
    old_left_re = rf'const {re.escape(var_left)}\s*=\s*(\[.*?\]);'
    old_right_re = rf'const {re.escape(var_right)}\s*=\s*(\[.*?\]);'
    chorus_match = re.search(chorus_line_re, content)
    old_left_match = re.search(old_left_re, content)
    old_right_match = re.search(old_right_re, content)
    if chorus_match and old_left_match and old_right_match:
        try:
            old_chorus = {}
            for pair in chorus_match.group(1).split(','):
                pair = pair.strip()
                if ':' in pair:
                    k, v = pair.split(':', 1)
                    old_chorus[int(k.strip())] = float(v.strip())
            old_songs = json.loads(old_left_match.group(1)) + json.loads(old_right_match.group(1))
            name_to_chorus = {old_songs[i]: old_chorus[i] for i in old_chorus if i < len(old_songs)}
            for i, song in enumerate(songs[:size]):
                if song["name"] in name_to_chorus:
                    new_chorus[i] = name_to_chorus[song["name"]]
            if new_chorus:
                print(f"  已保留 {len(new_chorus)} 首歌曲的副歌时间戳")
        except Exception:
            pass

    chorus_js = ','.join(f'{k}:{v}' for k, v in sorted(new_chorus.items()))
    js_block = f"""// {singer_name} ({size} songs ranked by QQ Music collection count)
const {var_left} = {json.dumps(left, ensure_ascii=False)};
const {var_right} = {json.dumps(right, ensure_ascii=False)};
const {var_nids} = {json.dumps(nids, ensure_ascii=False)};
const {var_pics} = {json.dumps(pics, ensure_ascii=False)};
const {var_chorus} = {{{chorus_js}}};

const {var_entrants} = {var_left}.concat({var_right}).map((name, i) => {{
  const nid = {var_nids}[i];
  const sr = i + 1;
  return {{ name, id: i, side: i < {var_left}.length ? 'L' : 'R', seed: i + 1, nid: nid || null, pic: {var_pics}[i] || '', chorus: {var_chorus}[i] || null, seedRank: sr, isSeed: sr <= 32 }};
}});"""

    # ---- 1. 移除旧的数据块（用变量前缀匹配，不依赖注释文本）----
    # 匹配: 可选注释行 → const PREFIX_LEFT ... → const PREFIX_ENTRANTS ... → \n});
    old_block_re = (
        rf'(//[^\n]*\n)?'                      # 可选的注释行
        rf'const {re.escape(var_left)}\b'      # const PREFIX_LEFT
        rf'.*?'                                 # 中间的所有数组声明
        rf'const {re.escape(var_entrants)}\b'  # const PREFIX_ENTRANTS
        rf'.*?'                                 # ENTRANTS 函数体
        rf'\n\}}\);\n*'                         # 换行 + }); + 尾部空行
    )
    content, removed = re.subn(old_block_re, '', content, flags=re.DOTALL)
    if removed:
        print(f"  已移除旧的 {prefix} 数据块")

    # ---- 2. 移除旧的 SINGERS 条目 ----
    # 匹配: "  key: {" 到 "\n  }," 或 "\n  }" (2空格缩进的闭合括号)
    entry_re = rf'  {re.escape(singer_key)}: \{{.*?\n  \}},?\n*'
    content, removed = re.subn(entry_re, '', content, flags=re.DOTALL)
    if removed:
        print(f"  已移除旧的 SINGERS 条目")

    # ---- 3. 在 export const SINGERS 之前插入新数据块 ----
    sing_export = "export const SINGERS"
    if sing_export in content:
        content = content.replace(sing_export, js_block + "\n\n" + sing_export)
    else:
        print("  ⚠ 找不到 export const SINGERS，数据块已生成但未插入")
        return

    # ---- 4. 在 SINGERS 对象末尾添加新条目 ----
    singers_obj_start = content.find("export const SINGERS = {")
    if singers_obj_start == -1:
        print("  ⚠ 找不到 SINGERS 对象")
        return

    # 找到最后一个歌手条目的结束位置 },\n};
    last_entry_end = content.rfind("},\n};", singers_obj_start)
    if last_entry_end != -1:
        insert_pos = last_entry_end + 2  # 在 }, 之后
        new_entry = f"""\n  {singer_key}: {{
    name: '{singer_name}',
    nameEn: '{singer_en}',
    bracketSize: {size},
    entrants: {var_entrants},
    seeds: {var_entrants}.map((_, i) => i),
    seedRank: Object.fromEntries({var_entrants}.map((e, i) => [i, i + 1])),
  }},"""
        content = content[:insert_pos] + new_entry + content[insert_pos:]

    # ---- 5. 更新 SINGER_ICONS ----
    icons_pattern = r"export const SINGER_ICONS = \{([^}]*)\};"
    icons_match = re.search(icons_pattern, content)
    if icons_match:
        icons_content = icons_match.group(1).strip()
        # 移除已有的
        icons_content = re.sub(rf"\s*{singer_key}:\s*'[^']*',?", '', icons_content)
        if icons_content and not icons_content.endswith(','):
            icons_content += ','
        icons_content += f" {singer_key}: '{icon}'"
        content = re.sub(icons_pattern, f"export const SINGER_ICONS = {{{icons_content}}};", content)

    # 写回
    with open(SINGERS_JS, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  ✓ singers.js 已更新")
    print(f"  ✓ 歌手 {singer_key} ({singer_name}) 已注册")
    print(f"  ✓ 数据: {len(left)} LEFT + {len(right)} RIGHT = {size} 首")
    print(f"  ✓ nid: {sum(1 for n in nids if n)}/{size} 有音频ID")
    print(f"  ✓ 封面: {sum(1 for p in pics if p)}/{size} 有封面URL")

# ========================================================================
#  Step 5: 构建并生成单文件 HTML
# ========================================================================
def build_and_inline():
    """构建 React 应用并生成单文件 HTML"""
    print(f"\n{'='*60}")
    print(f"Step 5: 构建应用并生成单文件 HTML")
    print(f"{'='*60}")

    import subprocess

    # vite build
    print("  正在构建...")
    result = subprocess.run(['npx', 'vite', 'build'], cwd=PROJECT_DIR,
                          capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        print(f"  ✗ 构建失败: {result.stderr}")
        return False
    print(f"  ✓ 构建成功")

    # inline HTML
    print("  正在生成单文件 HTML...")
    dist_dir = os.path.join(PROJECT_DIR, 'dist')
    with open(os.path.join(dist_dir, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()

    js_match = re.search(r'src="(/assets/[^"]+\.js)"', html)
    css_match = re.search(r'href="(/assets/[^"]+\.css)"', html)

    if not js_match or not css_match:
        print("  ✗ 找不到 JS/CSS 引用")
        return False

    js_file = js_match.group(1).lstrip('/')
    css_file = css_match.group(1).lstrip('/')

    with open(os.path.join(dist_dir, css_file), 'r', encoding='utf-8') as f:
        css = f.read()
    with open(os.path.join(dist_dir, js_file), 'r', encoding='utf-8') as f:
        js = f.read()

    html = html.replace(
        f'<script type="module" crossorigin src="/{js_file}"></script>',
        f'<script type="module">{js}</script>'
    )
    html = html.replace(
        f'<link rel="stylesheet" crossorigin href="/{css_file}">',
        f'<style>{css}</style>'
    )

    with open(HTML_OUTPUT, 'w', encoding='utf-8') as f:
        f.write(html)

    size_kb = os.path.getsize(HTML_OUTPUT) / 1024
    print(f"  ✓ 单文件 HTML 已生成: {HTML_OUTPUT} ({size_kb:.1f} KB)")
    return True

# ========================================================================
#  主流程
# ========================================================================
def main():
    parser = argparse.ArgumentParser(description='新增歌手标准化流水线')
    parser.add_argument('--name', required=True, help='歌手中文名')
    parser.add_argument('--mid', required=True, help='QQ音乐 singerMid')
    parser.add_argument('--key', required=True, help='歌手英文key (如 jj, jay)')
    parser.add_argument('--en', required=True, help='英文名缩写 (如 JJ, JAY)')
    parser.add_argument('--icon', default='🎤', help='图标 emoji (默认 🎤)')
    parser.add_argument('--size', type=int, default=128, choices=[64, 128], help='对阵规模 (默认 128)')
    parser.add_argument('--skip-fetch', action='store_true', help='跳过API抓取，使用已缓存的JSON')
    args = parser.parse_args()

    cache_file = os.path.join(WORK_DIR, f"singer_cache_{args.key}.json")

    if args.skip_fetch and os.path.exists(cache_file):
        print(f"使用缓存数据: {cache_file}")
        with open(cache_file, 'r') as f:
            cached = json.load(f)
        songs = cached["songs"]
        nids = cached["nids"]
        pics = cached["pics"]
    else:
        # Step 1: QQ音乐取歌
        songs = qq_fetch_songs(args.mid, args.size)

        if len(songs) == 0:
            print(f"\n✗ 未获取到任何歌曲，请检查 singerMid 是否正确")
            print(f"  获取方法: 打开 https://y.qq.com 搜索歌手 → 进入歌手页 → URL 中的 mid 参数")
            sys.exit(1)

        # Step 2: 网易云匹配 nid
        nids = match_nids(songs, args.name)

        # Step 3: QQ音乐取封面
        pics = qq_fetch_pics(songs)

        # 缓存
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump({"songs": songs, "nids": nids, "pics": pics}, f, ensure_ascii=False, indent=2)
        print(f"\n数据已缓存至: {cache_file}")

    # Step 4: 生成JS并更新singers.js
    generate_js(args.key, args.name, args.en, args.icon, args.size, songs, nids, pics)

    # Step 5: 构建并生成HTML
    build_and_inline()

    print(f"\n{'='*60}")
    print(f"✓ 全部完成！歌手 {args.name} 已添加到歌曲世界杯")
    print(f"{'='*60}")
    print(f"\n后续可选操作:")
    print(f"  - 手动补充副歌时间戳 (chorus) 到 singers.js 中的 {args.key.upper()}_CHORUS")
    print(f"  - 检查缺失 nid 的歌曲并手动匹配")
    print(f"  - 运行 dev server 预览: cd {PROJECT_DIR} && npx vite")

if __name__ == '__main__':
    main()
