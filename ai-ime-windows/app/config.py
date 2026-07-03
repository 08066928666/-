from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

APP_NAME = "AI 智能输入法"
VERSION = "0.1.0"

CONFIG_DIR = Path.home() / ".ai-ime"
CONFIG_FILE = CONFIG_DIR / "config.json"

DEFAULT_CONFIG = {
    "smart_mode": True,
    "target_language": "en",
    "auto_paste": True,
    "bilingual_send": True,
    "clipboard_watch": True,
    "hotkey_toggle_bar": "ctrl+shift+space",
    "hotkey_translate_clipboard": "ctrl+shift+t",
    "window_opacity": 0.96,
}


def ensure_config_dir() -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_config() -> dict:
    ensure_config_dir()
    if not CONFIG_FILE.exists():
        save_config(DEFAULT_CONFIG)
        return deepcopy(DEFAULT_CONFIG)
    try:
        with CONFIG_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        data = deepcopy(DEFAULT_CONFIG)
    merged = deepcopy(DEFAULT_CONFIG)
    merged.update(data)
    return merged


def save_config(config: dict) -> None:
    ensure_config_dir()
    with CONFIG_FILE.open("w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
