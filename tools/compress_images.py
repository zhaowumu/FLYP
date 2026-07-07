"""
图片批量压缩工具（独立 Python 脚本）
依赖: pip install Pillow
用法: python compress_images.py
"""
import os
import sys
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image
import threading

# 配置
MAX_SIZE = 1920       # 长边最大像素


def has_transparency(img: Image.Image) -> bool:
    """检测图片是否包含透明通道"""
    if img.mode in ("RGBA", "PA", "LA"):
        return True
    if img.mode == "P":
        # 检查调色板透明度
        try:
            alpha = img.getchannel("A")
            extrema = alpha.getextrema()
            return extrema[0] < 255
        except (ValueError, AttributeError):
            pass
    return False


def compress_image(src_path: str, dst_path: str) -> tuple[str, int, int]:
    """压缩并统一转为 PNG，返回 (状态, 原始大小, 压缩后大小)"""
    ext = os.path.splitext(src_path)[1].lower()
    original_size = os.path.getsize(src_path)
    dst_path = os.path.splitext(dst_path)[0] + ".png"

    try:
        img = Image.open(src_path)

        # 动图 GIF → 取第一帧
        if ext == ".gif":
            try:
                img.seek(1)
                is_animated = True
            except EOFError:
                is_animated = False
            img.seek(0)
        else:
            is_animated = False

        width, height = img.size
        longer_side = max(width, height)

        # 缩放到 MAX_SIZE
        if longer_side > MAX_SIZE:
            scale = MAX_SIZE / longer_side
            new_size = (int(width * scale), int(height * scale))
            img = img.resize(new_size, Image.LANCZOS)

        # 保留透明通道 → RGBA；无透明 → RGB
        keep_alpha = has_transparency(img)
        if keep_alpha:
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        img.save(dst_path, "PNG", optimize=True)

        compressed_size = os.path.getsize(dst_path)
        tag = "GIF→PNG" if ext == ".gif" and not is_animated else ("GIF动图→PNG" if is_animated else "")
        status = f"已压缩{('('+tag+')') if tag else ''}" if compressed_size < original_size else "已优化"
        return (status, original_size, compressed_size)

    except Exception as e:
        return (f"失败: {e}", original_size, 0)


def fmt_size(b: int) -> str:
    if b >= 1024 * 1024:
        return f"{b / 1024 / 1024:.2f} MB"
    if b >= 1024:
        return f"{b / 1024:.1f} KB"
    return f"{b} B"


class CompressApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("图片批量压缩工具")
        self.root.geometry("700x480")
        self.root.resizable(False, False)

        # 顶部
        header = tk.Frame(self.root, pady=15)
        header.pack()
        tk.Label(header, text="图片批量压缩", font=("Microsoft YaHei", 16, "bold")).pack()
        tk.Label(header, text=f"长边 ≤ {MAX_SIZE}px  |  统一输出 PNG  |  保留透明通道  |  动图取首帧",
                 font=("Microsoft YaHei", 9), fg="#666").pack()

        # 文件夹选择
        select_frame = tk.Frame(self.root, pady=10)
        select_frame.pack()
        self.folder_var = tk.StringVar()
        tk.Entry(select_frame, textvariable=self.folder_var, width=60, font=("Consolas", 10)).pack(side=tk.LEFT, padx=5)
        tk.Button(select_frame, text="选择文件夹", command=self.select_folder, width=12,
                  bg="#409eff", fg="white", font=("Microsoft YaHei", 9)).pack(side=tk.LEFT)

        # 输出路径
        out_frame = tk.Frame(self.root)
        out_frame.pack(pady=5)
        tk.Label(out_frame, text="输出到:", font=("Microsoft YaHei", 9), fg="#666").pack(side=tk.LEFT)
        self.out_var = tk.StringVar()
        tk.Label(out_frame, textvariable=self.out_var, font=("Consolas", 9), fg="#409eff").pack(side=tk.LEFT, padx=5)

        # 进度条
        self.progress = ttk.Progressbar(self.root, length=600, mode="determinate")
        self.progress.pack(pady=10)

        # 日志
        log_frame = tk.Frame(self.root)
        log_frame.pack()
        self.log = tk.Text(log_frame, width=80, height=14, font=("Consolas", 9), state=tk.DISABLED, bg="#1e1e1e", fg="#d4d4d4")
        scrollbar = tk.Scrollbar(log_frame, command=self.log.yview)
        self.log.configure(yscrollcommand=scrollbar.set)
        self.log.pack(side=tk.LEFT)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # 底部按钮
        btn_frame = tk.Frame(self.root, pady=10)
        btn_frame.pack()
        self.start_btn = tk.Button(btn_frame, text="开始压缩", command=self.start_compress, width=14,
                                    bg="#67c23a", fg="white", font=("Microsoft YaHei", 10, "bold"), state=tk.DISABLED)
        self.start_btn.pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text="退出", command=self.root.quit, width=10,
                  font=("Microsoft YaHei", 9)).pack(side=tk.LEFT, padx=5)

        self.root.mainloop()

    def log_msg(self, msg: str):
        self.log.configure(state=tk.NORMAL)
        self.log.insert(tk.END, msg + "\n")
        self.log.see(tk.END)
        self.log.configure(state=tk.DISABLED)

    def select_folder(self):
        folder = filedialog.askdirectory(title="选择包含图片的文件夹")
        if folder:
            self.folder_var.set(folder)
            self.out_var.set(os.path.join(folder, "compressed"))
            self.start_btn.configure(state=tk.NORMAL)

    def start_compress(self):
        src_dir = self.folder_var.get()
        out_dir = os.path.join(src_dir, "compressed")
        self.out_var.set(out_dir)

        # 扫描图片
        IMG_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
        files = []
        for f in sorted(os.listdir(src_dir)):
            if os.path.splitext(f)[1].lower() in IMG_EXTS:
                files.append(os.path.join(src_dir, f))

        if not files:
            messagebox.showinfo("提示", "文件夹中没有图片文件")
            return

        self.start_btn.configure(state=tk.DISABLED)
        self.log.configure(state=tk.NORMAL)
        self.log.delete("1.0", tk.END)
        self.log.configure(state=tk.DISABLED)
        self.progress["maximum"] = len(files)
        self.progress["value"] = 0

        self.log_msg(f"源文件夹: {src_dir}")
        self.log_msg(f"输出到:   {out_dir}")
        self.log_msg(f"共 {len(files)} 个图片\n")
        self.log_msg("─" * 65)

        # 后台线程处理
        def run():
            total_original = 0
            total_compressed = 0
            count_ok = 0
            count_skip = 0
            count_fail = 0

            for i, src in enumerate(files):
                name = os.path.basename(src)
                dst = os.path.join(out_dir, name)

                status, orig, comp = compress_image(src, dst)
                total_original += orig
                total_compressed += comp

                name_col = name[:50].ljust(52)
                if status.startswith("已压缩"):
                    pct = round((1 - comp / orig) * 100) if orig > 0 else 0
                    tag = status[3:] if len(status) > 3 else ""
                    self.log_msg(f"  {name_col} {fmt_size(orig).rjust(8)} → {fmt_size(comp).rjust(8)}  ({pct}%){tag}")
                    count_ok += 1
                elif status == "已优化":
                    self.log_msg(f"  {name_col} {fmt_size(orig).rjust(8)} → 无法进一步压缩")
                    count_skip += 1
                else:
                    self.log_msg(f"  {name_col} {'ERROR'.rjust(8)}  {status}")
                    count_fail += 1

                self.progress["value"] = i + 1
                self.root.update_idletasks()

            saved = total_original - total_compressed
            self.log_msg("─" * 65)
            self.log_msg(f"\n  文件: 已压缩 {count_ok}  |  跳过 {count_skip}  |  失败 {count_fail}")
            self.log_msg(f"  原始: {fmt_size(total_original).rjust(10)}")
            self.log_msg(f"  压缩: {fmt_size(total_compressed).rjust(10)}")
            if total_original > 0:
                self.log_msg(f"  节约: {fmt_size(saved).rjust(10)}  ({round(saved / total_original * 100)}%)")
            self.log_msg(f"\n  输出文件夹: {out_dir}")

            self.start_btn.configure(state=tk.NORMAL)

        threading.Thread(target=run, daemon=True).start()


if __name__ == "__main__":
    try:
        from PIL import Image
    except ImportError:
        print("请先安装 Pillow: pip install Pillow")
        # 显示 GUI 错误
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("缺少依赖", "请先安装 Pillow 库:\npip install Pillow")
        sys.exit(1)

    CompressApp()
