from __future__ import annotations

import ctypes
import threading
from typing import Callable

import keyboard


class HotkeyManager:
    def __init__(self) -> None:
        self._hooks: list = []
        self._lock = threading.Lock()

    def register(self, hotkey: str, callback: Callable[[], None]) -> None:
        with self._lock:
            hook = keyboard.add_hotkey(hotkey, callback, suppress=False)
            self._hooks.append(hook)

    def clear(self) -> None:
        with self._lock:
            keyboard.unhook_all_hotkeys()
            self._hooks.clear()


def set_window_topmost(window) -> None:
    """Windows: 窗口置顶。"""
    try:
        hwnd = ctypes.windll.user32.GetParent(window.winfo_id())
        ctypes.windll.user32.SetWindowPos(hwnd, -1, 0, 0, 0, 0, 0x0001 | 0x0002)
    except Exception:
        try:
            window.attributes("-topmost", True)
        except Exception:
            pass
