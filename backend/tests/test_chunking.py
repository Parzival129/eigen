import pytest
from app.services.parsing.base import ParsedChunk
from app.services.chunking.chunker import chunk_parsed_content


def test_basic_chunking():
    parsed = [ParsedChunk(text="Hello world. This is a test. " * 30, page_number=1)]
    chunks = chunk_parsed_content(parsed)
    assert len(chunks) >= 1
    for chunk in chunks:
        assert chunk.token_count <= 600  # some tolerance


def test_metadata_propagation():
    parsed = [ParsedChunk(text="Chapter content here. " * 20, chapter="Chapter 1", page_number=5)]
    chunks = chunk_parsed_content(parsed)
    assert all(c.chapter == "Chapter 1" for c in chunks)


def test_empty_input():
    chunks = chunk_parsed_content([])
    assert chunks == []


def test_overlap():
    # Two sections that should produce overlap
    parsed = [
        ParsedChunk(text="Sentence one. Sentence two. Sentence three. " * 15),
        ParsedChunk(text="New section content. More text here. " * 15),
    ]
    chunks = chunk_parsed_content(parsed)
    assert len(chunks) >= 2
