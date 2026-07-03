from __future__ import annotations

import hashlib
import threading
import time
from typing import Callable

import pyperclip


class ClipboardWatcher:
    """监听剪贴板变化，智能模式下自动翻译外语内容。"""

    def __init__(self, on_foreign_text: Callable[[str], None], interval: float = 0.4):
        self._on_foreign_text = on_foreign_text
        self._interval = interval
        self._enabled = False
        self._thread: threading.Thread | None = None
        self._last_hash = ""
        self._last_notified = ""

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._enabled = True
        self._thread = threading.Thread(target=self._loop, daemon=True, name="clipboard-watcher")
        self._thread.start()

    def stop(self) -> None:
        self._enabled = False

    def _loop(self) -> None:
        while self._enabled:
            try:
                text = pyperclip.paste() or ""
                text = text.strip()
                if text and len(text) <= 2000:
                    digest = hashlib.md5(text.encode("utf-8", errors="ignore")).hexdigest()
                    if digest != self._last_hash:
                        self._last_hash = digest
                        if text != self._last_notified:
                            self._on_foreign_text(text)
            except Exception:
                pass
            time.sleep(self._interval)

    def mark_handled(self, text: str) -> None:
        self._last_notified = text.strip()
