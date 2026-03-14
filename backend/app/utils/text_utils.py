import re
import tiktoken

_encoder = None


def _get_encoder():
    global _encoder
    if _encoder is None:
        _encoder = tiktoken.get_encoding("cl100k_base")
    return _encoder


def count_tokens(text: str) -> int:
    return len(_get_encoder().encode(text))


def split_text_by_tokens(text: str, max_tokens: int, overlap_tokens: int = 0) -> list[str]:
    if max_tokens <= 0:
        raise ValueError("max_tokens must be > 0")
    if overlap_tokens < 0 or overlap_tokens >= max_tokens:
        raise ValueError("overlap_tokens must be >= 0 and < max_tokens")

    cleaned = clean_text(text)
    if not cleaned:
        return []

    encoder = _get_encoder()
    tokens = encoder.encode(cleaned)
    if len(tokens) <= max_tokens:
        return [cleaned]

    windows: list[str] = []
    step = max_tokens - overlap_tokens
    start = 0

    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        piece = encoder.decode(tokens[start:end]).strip()
        if piece:
            windows.append(piece)
        if end >= len(tokens):
            break
        start += step

    return windows


def clean_text(text: str) -> str:
    # Remove null bytes
    text = text.replace("\x00", "")
    # Normalize whitespace
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r" +", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
