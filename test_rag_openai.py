import sys
sys.path.insert(0, r"C:\Users\jobin joseph\document-ai\ai-service")

from unittest.mock import patch, MagicMock
import os
import shutil
import app.config as config_module

os.environ["LLM_PROVIDER"] = "openai"
os.environ["OPENAI_API_KEY"] = "sk-fake-test-key"
os.environ["CHROMA_PERSIST_DIR"] = "C:/tmp/chroma_qa_mock"

config_module.get_settings.cache_clear()

shutil.rmtree("C:/tmp/chroma_qa_mock", ignore_errors=True)

from app.chunking import chunk_text
from app.embeddings import embed_texts
from app.vector_store import upsert_document_chunks

chunks = chunk_text(
    "Employees get 20 days of annual leave per year.",
    chunk_size_words=15,
    chunk_overlap_words=2
)

embeddings = embed_texts([c.text for c in chunks])
upsert_document_chunks(601, chunks, embeddings)

from app.rag import answer_question

fake_response = MagicMock()
fake_response.json.return_value = {
    "choices": [
        {
            "message": {
                "content": "Employees receive 20 days of annual leave per year."
            }
        }
    ]
}
fake_response.raise_for_status.return_value = None

with patch("app.rag.requests.post", return_value=fake_response) as mock_post:
    result = answer_question(
        "How much annual leave do employees get?"
    )

    print("answer_type:", result.answer_type)
    print("answer:", result.answer)
    print("sources:", result.sources)

    assert result.answer_type == "generated"
    assert "20 days" in result.answer

    call_kwargs = mock_post.call_args.kwargs

    print(
        "\nsystem prompt included context:",
        "Employees get 20 days" in call_kwargs["json"]["messages"][0]["content"]
    )

    print("model used:", call_kwargs["json"]["model"])

    assert (
        "Employees get 20 days"
        in call_kwargs["json"]["messages"][0]["content"]
    )

    print(
        "OK - generative path builds correct "
        "context-grounded prompt and parses response"
    )

print("\n=== missing API key raises RuntimeError (caught as 503 by the router) ===")

os.environ["OPENAI_API_KEY"] = ""
config_module.get_settings.cache_clear()

try:
    answer_question("How much annual leave?")
    print("BUG: should have raised")
except RuntimeError as e:
    print("RuntimeError (expected):", e)

print("\nALL MOCKED RAG OPENAI-PATH TESTS PASSED")
