import re


def sanitize_filename(filename: str) -> str:
    # Remove path traversal
    filename = filename.replace("..", "").replace("/", "").replace("\\", "")
    # Keep only safe chars
    filename = re.sub(r"[^a-zA-Z0-9._\-]", "_", filename)
    # Limit length
    if len(filename) > 255:
        name, _, ext = filename.rpartition(".")
        filename = name[:250] + "." + ext
    return filename or "unnamed_file"
