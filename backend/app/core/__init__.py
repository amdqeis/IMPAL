__all__ = ["settings"]


def __getattr__(name: str):
    if name == "settings":
        from .config import settings

        return settings
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
