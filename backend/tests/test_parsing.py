import pytest
import tempfile
import os
from app.services.parsing.txt_parser import TxtParser


@pytest.mark.asyncio
async def test_txt_parser():
    parser = TxtParser()
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write("First paragraph.\n\nSecond paragraph.\n\nThird paragraph.")
        path = f.name
    try:
        chunks = await parser.parse(path)
        assert len(chunks) == 3
        assert chunks[0].text == "First paragraph."
    finally:
        os.unlink(path)


@pytest.mark.asyncio
async def test_txt_parser_single_paragraph():
    parser = TxtParser()
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write("Just one paragraph here.")
        path = f.name
    try:
        chunks = await parser.parse(path)
        assert len(chunks) == 1
    finally:
        os.unlink(path)
