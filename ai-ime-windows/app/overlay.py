from __future__ import annotations

import threading
from typing import Callable

import customtkinter as ctk

from app.config import APP_NAME
from app.hotkeys import set_window_topmost
from app.translator import LANG_LABELS, TranslationResult, translate_from_chinese


class InputBar(ctk.CTkToplevel):
    """底部悬浮输入栏：输入中文 → 实时预览外语 → 一键发送。"""

    def __init__(
        self,
        master,
        config: dict,
        on_send: Callable[[str], None],
        on_config_change: Callable[[dict], None] | None = None,
    ):
        super().__init__(master)
        self._config = config
        self._on_send = on_send
        self._on_config_change = on_config_change
        self._debounce_id = None

        self.title(APP_NAME)
        self.geometry("720x200+0+0")
        self.resizable(False, False)
        self.attributes("-alpha", config.get("window_opacity", 0.96))
        self.configure(fg_color="#1a1f26")

        self.update_idletasks()
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        w, h = 720, 200
        self.geometry(f"{w}x{h}+{(sw - w) // 2}+{sh - h - 60}")
        set_window_topmost(self)

        self._build()
        self.withdraw()
        self.protocol("WM_DELETE_WINDOW", self.hide)

    def _build(self) -> None:
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=16, pady=(12, 4))

        self._smart_var = ctk.BooleanVar(value=self._config.get("smart_mode", True))
        ctk.CTkSwitch(
            header,
            text="AI 智能模式",
            variable=self._smart_var,
            command=self._toggle_smart,
            font=ctk.CTkFont(size=14, weight="bold"),
        ).pack(side="left")

        target = self._config.get("target_language", "en")
        ctk.CTkLabel(header, text="对方语言:", text_color="#8b98a5").pack(side="left", padx=(20, 6))
        self._lang_menu = ctk.CTkOptionMenu(
            header,
            values=["en · 英语", "ja · 日语", "ko · 韩语"],
            command=self._on_lang_change,
            width=120,
        )
        self._lang_menu.set(self._lang_label(target))
        self._lang_menu.pack(side="left")

        ctk.CTkLabel(
            header,
            text="Enter 发送  ·  Esc 隐藏  ·  Ctrl+Shift+Space 呼出",
            text_color="#5c6b7a",
            font=ctk.CTkFont(size=12),
        ).pack(side="right")

        self._entry = ctk.CTkEntry(
            self,
            placeholder_text="输入中文，自动翻译成外语并发送…",
            height=44,
            font=ctk.CTkFont(size=16),
            border_color="#34c759",
            border_width=2 if self._smart_var.get() else 0,
        )
        self._entry.pack(fill="x", padx=16, pady=8)
        self._entry.bind("<KeyRelease>", self._on_type)
        self._entry.bind("<Return>", self._on_enter)
        self._entry.bind("<Escape>", lambda _e: self.hide())

        self._preview_frame = ctk.CTkFrame(self, fg_color="#0f2a18", corner_radius=8)
        self._preview_title = ctk.CTkLabel(
            self._preview_frame,
            text="",
            text_color="#34c759",
            font=ctk.CTkFont(size=12),
            anchor="w",
        )
        self._preview_title.pack(fill="x", padx=12, pady=(8, 0))
        self._preview_foreign = ctk.CTkLabel(
            self._preview_frame,
            text="",
            text_color="#ffffff",
            font=ctk.CTkFont(size=15, weight="bold"),
            anchor="w",
            wraplength=660,
            justify="left",
        )
        self._preview_foreign.pack(fill="x", padx=12, pady=(2, 8))

        self._btn_row = ctk.CTkFrame(self, fg_color="transparent")
        self._btn_row.pack(fill="x", padx=16, pady=(0, 12))
        ctk.CTkButton(self._btn_row, text="发送", width=100, command=self._send, fg_color="#007aff").pack(side="right")
        ctk.CTkButton(self._btn_row, text="清空", width=80, fg_color="#3a4450", command=self._clear).pack(side="right", padx=8)

    def _lang_label(self, code: str) -> str:
        return {"en": "en · 英语", "ja": "ja · 日语", "ko": "ko · 韩语"}.get(code, "en · 英语")

    def _lang_code(self, label: str) -> str:
        return label.split(" · ")[0]

    def _on_lang_change(self, label: str) -> None:
        self._config["target_language"] = self._lang_code(label)
        if self._on_config_change:
            self._on_config_change(self._config)
        self._refresh_preview()

    def _toggle_smart(self) -> None:
        self._config["smart_mode"] = self._smart_var.get()
        border = 2 if self._smart_var.get() else 0
        self._entry.configure(border_width=border)
        if self._on_config_change:
            self._on_config_change(self._config)
        self._refresh_preview()

    def _on_type(self, _event=None) -> None:
        if self._debounce_id:
            self.after_cancel(self._debounce_id)
        self._debounce_id = self.after(180, self._refresh_preview)

    def _refresh_preview(self) -> None:
        text = self._entry.get().strip()
        if not text or not self._smart_var.get():
            self._preview_frame.pack_forget()
            return

        target = self._config.get("target_language", "en")
        result = translate_from_chinese(text, target)
        self._preview_title.configure(
            text=f"发送预览 · {LANG_LABELS.get(target, target)}（{result.engine}）"
        )
        self._preview_foreign.configure(text=result.translated)
        self._preview_frame.pack(fill="x", padx=16, pady=(0, 4), before=self._btn_row)

    def _clear(self) -> None:
        self._entry.delete(0, "end")
        self._preview_frame.pack_forget()

    def _on_enter(self, _event=None) -> None:
        self._send()

    def _send(self) -> None:
        text = self._entry.get().strip()
        if not text:
            return
        self._on_send(text)
        self._clear()
        self.hide()

    def show_and_focus(self) -> None:
        self.deiconify()
        self.lift()
        set_window_topmost(self)

        def _focus() -> None:
            self._entry.focus_set()
            self._entry.icursor("end")

        self.after(50, _focus)

    def hide(self) -> None:
        self.withdraw()


class IncomingToast(ctk.CTkToplevel):
    """收到外语剪贴板内容时，显示原文 + 中文对照。"""

    def __init__(self, master):
        super().__init__(master)
        self.title("收到消息翻译")
        self.geometry("420x160")
        self.resizable(False, False)
        self.attributes("-alpha", 0.97)
        self.configure(fg_color="#1b2838")
        set_window_topmost(self)
        self._auto_hide_id = None
        self.withdraw()

        self._original = ctk.CTkLabel(self, text="", wraplength=380, justify="left", font=ctk.CTkFont(size=14))
        self._original.pack(fill="x", padx=16, pady=(14, 4))
        self._chinese = ctk.CTkLabel(
            self,
            text="",
            wraplength=380,
            justify="left",
            text_color="#8b98a5",
            font=ctk.CTkFont(size=13),
        )
        self._chinese.pack(fill="x", padx=16, pady=(0, 12))

        ctk.CTkButton(self, text="知道了", width=80, command=self.hide, fg_color="#2a475e").pack(pady=(0, 12))

    def show_result(self, result: TranslationResult) -> None:
        if result.source_lang.startswith("zh"):
            return

        self._original.configure(text=result.original)
        self._chinese.configure(text=f"🇨🇳 {result.translated}")

        sw = self.winfo_screenwidth()
        self.geometry(f"420x160+{sw - 440}+80")
        self.deiconify()
        self.lift()

        if self._auto_hide_id:
            self.after_cancel(self._auto_hide_id)
        self._auto_hide_id = self.after(12000, self.hide)

    def hide(self) -> None:
        self.withdraw()
