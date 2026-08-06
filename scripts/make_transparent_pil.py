#!/usr/bin/env python3
"""Pillow 色彩保留版：只保留核心视觉元素，彻底消除灰边/投影/水印。

原理：
- 不再以「距离背景色」为判断依据，而是以「像素本身的色彩特征」来分类
- 保留：高饱和度彩色(粉CUP/青星/金皇冠) + 纯白(SONG WORLD) + 纯黑(描边)
- 剔除：所有灰调像素(投影/光晕/棋盘格底/AI水印)
- 形态学闭运算修复内容孔洞
- 边缘用窄幅 alpha 过渡保持平滑(不做去污染，因为灰像素直接丢弃)

用法: .venv\\Scripts\\python.exe scripts/make_transparent_pil.py <in.png> <out.png>
"""
import sys
import math
from PIL import Image, ImageFilter


def rgb_to_hsv(r, g, b):
    """RGB → HSV, 返回 (h, s, v) 各 0~1"""
    mx = max(r, g, b)
    mn = min(r, g, b)
    diff = mx - mn
    v = mx / 255.0
    if diff == 0:
        return 0.0, 0.0, v
    s = diff / mx
    if mx == r:
        h = (60 * ((g - b) / diff) + 360) % 360
    elif mx == g:
        h = (60 * ((b - r) / diff) + 120) % 360
    else:
        h = (60 * ((r - g) / diff) + 240) % 360
    return h / 360.0, s, v


def is_vibrant(r, g, b):
    """判断是否为高饱和度彩色像素（粉/青/金/品红等）"""
    _, s, v = rgb_to_hsv(r, g, b)
    return s > 0.35 and v > 0.25


def is_white(r, g, b):
    """判断是否为白色/近白（文字主体）"""
    return r > 220 and g > 220 and b > 210


def is_black_stroke(r, g, b):
    """判断是否为黑色描边/轮廓"""
    # 允许轻微偏色（抗锯齿边缘的深色）
    return r < 60 and g < 60 and b < 70


def is_gray(r, g, b):
    """判断是否为灰调（投影/光晕/背景/水印）"""
    spread = max(r, g, b) - min(r, g, b)
    brightness = (r + g + b) / 3.0
    # 灰色定义：低饱和度(spread 小) 且不是纯黑也不是纯白
    return spread < 40 and 30 < brightness < 215


def main():
    if len(sys.argv) < 3:
        print("usage: make_transparent_pil.py <in> <out>")
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]

    img = Image.open(src).convert("RGB")
    W, H = img.size
    px = img.load()

    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    opx = out.load()

    # Pass 1: 分类 + 生成 alpha
    kept = 0
    transparent = 0

    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]

            if is_vibrant(r, g, b) or is_white(r, g, b) or is_black_stroke(r, g, b):
                opx[x, y] = (r, g, b, 255)
                kept += 1
            elif is_gray(r, g, b):
                opx[x, y] = (0, 0, 0, 0)
                transparent += 1
            else:
                # 中间地带：根据饱和度给过渡 alpha
                _, s, _ = rgb_to_hsv(r, g, b)
                alpha = int(min(255, s * 600))  # s>0.42 才能到 255
                if alpha < 15:
                    alpha = 0
                    transparent += 1
                else:
                    opx[x, y] = (r, g, b, alpha)
                    kept += 1

    # Pass 2: 形态学闭运算修复前景内部小孔洞
    alpha_ch = out.split()[3]
    dilated = alpha_ch.filter(ImageFilter.MaxFilter(3))
    eroded = dilated.filter(ImageFilter.MinFilter(3))

    final_alpha = Image.new("L", (W, H))
    fap = final_alpha.load()
    epx = eroded.load()
    apx = alpha_ch.load()

    holes_fixed = 0
    for y in range(H):
        for x in range(W):
            orig_a = apx[x, y]
            closed_a = epx[x, y]
            if closed_a >= 230 and orig_a < 8:
                fap[x, y] = 255
                holes_fixed += 1
            else:
                fap[x, y] = orig_a

    out.putalpha(final_alpha)
    out.save(dst)

    total = W * H
    print(f"[ok] {W}x{H}  kept={kept}({100*kept/total:.1f}%)"
          f"  transparent={transparent}({100*transparent/total:.1f}%)"
          f"  holes_fixed={holes_fixed}")
    # 抽样检查关键区域
    samples = {
        "corner": (5, 5),
        "U_body": (int(W * 0.38), int(H * 0.62)),
        "U_edge": (int(W * 0.33), int(H * 0.55)),
        "pink": (int(W * 0.55), int(H * 0.58)),
        "white_text": (int(W * 0.28), int(H * 0.38)),
        "crown": (int(W * 0.72), int(H * 0.22)),
        "watermark_area": (int(W * 0.92), int(H * 0.95)),
    }
    for name, (sx, sy) in samples.items():
        print(f"  {name}({sx},{sy})={out.getpixel((sx, sy))}")


if __name__ == "__main__":
    main()
