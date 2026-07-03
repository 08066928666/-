from __future__ import annotations

from typing import Callable

from PIL import Image, ImageDraw
from pystray import Icon, Menu, MenuItem


def _create_icon_image() -> Image.Image:
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse((4, 4, 60, 60), fill=(52, 199, 89, 255))
    draw.text((18, 20), "AI", fill=(255, 255, 255, 255))
    return img


class TrayApp:
    def __init__(
        self,
        config: dict,
        on_toggle_bar: Callable[[], None],
        on_toggle_smart: Callable[[bool], None],
        on_translate_clipboard: Callable[[], None],
        on_quit: Callable[[], None],
    ):
        self._config = config
        self._on_toggle_bar = on_toggle_bar
        self._on_toggle_smart = on_toggle_smart
        self._on_translate_clipboard = on_translate_clipboard
        self._on_quit = on_quit
        self._icon: Icon | None = None
        self._thread: threading.Thread | None = None

    def _menu(self) -> Menu:
        return Menu(
            MenuItem("呼出输入栏 (Ctrl+Shift+Space)", lambda _i, _it: self._on_toggle_bar()),
            MenuItem("翻译剪贴板 (Ctrl+Shift+T)", lambda _i, it: self._on_translate_clipboard()),
            Menu.SEPARATOR,
            MenuItem(
                "AI 智能模式",
                lambda _i, it: self._on_toggle_smart(not self._config.get("smart_mode", True)),
                checked=lambda _item: self._config.get("smart_mode", True),
            ),
            Menu.SEPARATOR,
            MenuItem("退出", lambda _i, _it: self._on_quit()),
        )

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run, daemon=True, name="tray-icon")
        self._thread.start()

    def _run(self) -> None:
        self._icon = Icon("ai-ime", _create_icon_image(), "AI 智能输入法", menu=self._menu())
        self._icon.run()

    def update_menu(self) -> None:
        if self._icon:
            self._icon.menu = self._menu()
            self._icon.update_menu()

    def stop(self) -> None:
        if self._icon:
            self._icon.stop()
