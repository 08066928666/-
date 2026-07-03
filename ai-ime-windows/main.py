"""
AI 智能输入法 — Windows 版

Steam / Discord 等全局场景：
- 复制对方外语 → 自动弹出中文对照
- Ctrl+Shift+Space 呼出输入栏 → 输入中文 → 双语发送
"""

from __future__ import annotations

import sys
import threading
import time

import customtkinter as ctk
import pyautogui
import pyperclip

from app.clipboard_watcher import ClipboardWatcher
from app.config import APP_NAME, VERSION, load_config, save_config
from app.hotkeys import HotkeyManager
from app.overlay import IncomingToast, InputBar
from app.tray import TrayApp
from app.translator import detect_language, format_bilingual_send, translate_from_chinese, translate_to_chinese

pyautogui.PAUSE = 0.05
pyautogui.FAILSAFE = False


class Application:
    def __init__(self) -> None:
        self.config = load_config()
        self._hotkeys = HotkeyManager()
        self._clipboard = ClipboardWatcher(self._on_clipboard_text)
        self._tray: TrayApp | None = None
        self._shutting_down = False
        self._ignore_clipboard_until = 0.0

        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("green")

        self.root = ctk.CTk()
        self.root.title(f"{APP_NAME} v{VERSION}")
        self.root.geometry("360x120")
        self.root.withdraw()

        self.input_bar = InputBar(
            self.root,
            self.config,
            on_send=self._handle_send,
            on_config_change=self._persist_config,
        )
        self.toast = IncomingToast(self.root)

        self._register_hotkeys()
        self._start_services()

    def _persist_config(self, config: dict) -> None:
        self.config = config
        save_config(config)
        if self._tray:
            self._tray.update_menu()
        self._sync_clipboard_watch()

    def _sync_clipboard_watch(self) -> None:
        if self.config.get("smart_mode") and self.config.get("clipboard_watch"):
            self._clipboard.start()
        else:
            self._clipboard.stop()

    def _register_hotkeys(self) -> None:
        self._hotkeys.register(self.config["hotkey_toggle_bar"], self._toggle_bar)
        self._hotkeys.register(self.config["hotkey_translate_clipboard"], self._translate_clipboard_manual)

    def _start_services(self) -> None:
        self._sync_clipboard_watch()
        self._tray = TrayApp(
            config=self.config,
            on_toggle_bar=self._toggle_bar,
            on_toggle_smart=self._set_smart_mode,
            on_translate_clipboard=self._translate_clipboard_manual,
            on_quit=self.quit,
        )
        self._tray.start()

    def _toggle_bar(self) -> None:
        if self.input_bar.state() == "withdrawn":
            self.root.after(0, self.input_bar.show_and_focus)
        else:
            self.root.after(0, self.input_bar.hide)

    def _set_smart_mode(self, enabled: bool) -> None:
        self.config["smart_mode"] = enabled
        save_config(self.config)
        self.input_bar._smart_var.set(enabled)
        self.input_bar._toggle_smart()
        if self._tray:
            self._tray.update_menu()
        self._sync_clipboard_watch()

    def _on_clipboard_text(self, text: str) -> None:
        if time.time() < self._ignore_clipboard_until:
            return
        if not self.config.get("smart_mode") or not self.config.get("clipboard_watch"):
            return
        if detect_language(text).startswith("zh"):
            return

        result = translate_to_chinese(text)
        self._clipboard.mark_handled(text)
        self.root.after(0, lambda: self.toast.show_result(result))

    def _translate_clipboard_manual(self) -> None:
        text = (pyperclip.paste() or "").strip()
        if not text:
            return
        result = translate_to_chinese(text)
        self._clipboard.mark_handled(text)
        self.root.after(0, lambda: self.toast.show_result(result))

    def _handle_send(self, chinese: str) -> None:
        if not self.config.get("smart_mode", True):
            payload = chinese
        else:
            target = self.config.get("target_language", "en")
            result = translate_from_chinese(chinese, target)
            payload = format_bilingual_send(
                chinese,
                result.translated,
                bilingual=self.config.get("bilingual_send", True),
            )

        pyperclip.copy(payload)
        self._ignore_clipboard_until = time.time() + 1.5
        if self.config.get("auto_paste", True):
            threading.Thread(target=self._auto_paste, daemon=True).start()

    def _auto_paste(self) -> None:
        try:
            pyautogui.hotkey("ctrl", "v")
        except Exception:
            pass

    def quit(self) -> None:
        if self._shutting_down:
            return
        self._shutting_down = True
        self._clipboard.stop()
        self._hotkeys.clear()
        if self._tray:
            self._tray.stop()
        self.root.after(0, self.root.destroy)

    def run(self) -> None:
        self.root.mainloop()


def main() -> int:
    if sys.platform != "win32":
        print("此程序仅支持 Windows。请在 Windows 上运行。")
        return 1
    app = Application()
    app.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
