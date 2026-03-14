import re
from dataclasses import dataclass
from app.services.parsing.base import ParsedChunk
from app.utils.text_utils import count_tokens, clean_text, split_text_by_tokens

TARGET_TOKENS = 512
OVERLAP_TOKENS = 50


@dataclass
class Chunk:
    text: str
    chunk_index: int
    token_count: int
    page_number: int | None = None
    chapter: str | None = None
    section: str | None = None
    start_time: float | None = None
    end_time: float | None = None
    heading_context: str | None = None


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def _split_to_target_windows(text: str) -> list[str]:
    return split_text_by_tokens(text, TARGET_TOKENS, overlap_tokens=0)


def chunk_parsed_content(parsed_chunks: list[ParsedChunk]) -> list[Chunk]:
    chunks: list[Chunk] = []
    current_sentences: list[str] = []
    current_tokens = 0
    chunk_index = 0

    # Track metadata for the current accumulation window
    # We assign the metadata from the ParsedChunk that contributes the most sentences
    current_meta: dict = {}
    sentences_from_current_meta: int = 0
    current_meta_sentence_count: int = 0

    def meta_from(pc: ParsedChunk) -> dict:
        return {
            "page_number": pc.page_number,
            "chapter": pc.chapter,
            "section": pc.section,
            "start_time": pc.start_time,
            "end_time": pc.end_time,
            "heading_context": pc.heading_context,
        }

    def flush(overlap_sentences: list[str]) -> None:
        nonlocal chunk_index, current_sentences, current_tokens
        nonlocal current_meta, sentences_from_current_meta, current_meta_sentence_count
        if not current_sentences:
            return
        text = " ".join(current_sentences)
        toks = count_tokens(text)
        chunks.append(Chunk(text=text, chunk_index=chunk_index, token_count=toks, **current_meta))
        chunk_index += 1
        # carry overlap sentences into next chunk
        current_sentences = overlap_sentences
        current_tokens = sum(count_tokens(s) for s in overlap_sentences)
        # reset meta tracking — overlap sentences inherit meta from the flushed chunk
        current_meta_sentence_count = len(overlap_sentences)
        sentences_from_current_meta = len(overlap_sentences)

    for pc in parsed_chunks:
        sentences = _split_sentences(pc.text)
        meta = meta_from(pc)
        for sentence in sentences:
            sentence_parts = [sentence]
            if count_tokens(sentence) > TARGET_TOKENS:
                sentence_parts = _split_to_target_windows(sentence)

            for sentence_part in sentence_parts:
                s_tokens = count_tokens(sentence_part)
                if current_tokens + s_tokens > TARGET_TOKENS and current_sentences:
                    # compute overlap: take last N sentences fitting OVERLAP_TOKENS
                    overlap: list[str] = []
                    overlap_t = 0
                    for s in reversed(current_sentences):
                        st = count_tokens(s)
                        if overlap_t + st <= OVERLAP_TOKENS:
                            overlap.insert(0, s)
                            overlap_t += st
                        else:
                            break
                    flush(overlap)
                    # After flush, set meta to current parsed chunk since we're starting fresh
                    current_meta = meta
                    current_meta_sentence_count = 0
                    sentences_from_current_meta = 0

                current_sentences.append(sentence_part)
                current_tokens += s_tokens
                current_meta_sentence_count += 1

                # The dominant meta is from the ParsedChunk with the most sentences contributed
                # to the current window. Update if this ParsedChunk now has more.
                if sentences_from_current_meta == 0 or current_meta_sentence_count > sentences_from_current_meta:
                    current_meta = meta
                    sentences_from_current_meta = current_meta_sentence_count

    # flush remaining
    flush([])
    return chunks
