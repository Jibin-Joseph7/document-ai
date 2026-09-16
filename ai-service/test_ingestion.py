import sys
sys.path.insert(0, ".")

from app.ingestion import ingest_document, remove_document
from app.vector_store import count_chunks_for_document, query_similar
from app.embeddings import embed_texts
from app.extraction import MIME_PDF, MIME_DOCX

print("=== ingest real PDF fixture end-to-end ===")

result = ingest_document(
    201,
    r"C:\tmp\fixtures\leave-policy.pdf",
    MIME_PDF,
    extra_metadata={"owner_id": 5, "category": "HR"}
)

print(result)
assert result.status == "ready"
assert result.chunk_count > 0
assert count_chunks_for_document(201) == result.chunk_count
print("OK")


print("\n=== ingest real DOCX fixture ===")

result2 = ingest_document(
    202,
    r"C:\tmp\fixtures\handbook.docx",
    MIME_DOCX,
    extra_metadata={"owner_id": 5, "category": "HR"}
)

print(result2)
assert result2.status == "ready"
print("OK")


print("\n=== verify metadata (owner_id/category) attached to stored chunks ===")

hits = query_similar(
    embed_texts(["annual leave"])[0],
    n_results=1,
    where={"document_id": 201}
)

print(hits[0]["metadata"])

assert hits[0]["metadata"]["owner_id"] == 5
assert hits[0]["metadata"]["category"] == "HR"

print("OK - extra_metadata correctly attached to every chunk")


print("\n=== unsupported/corrupt file fails gracefully (no exception) ===")

result3 = ingest_document(
    203,
    r"C:\tmp\fixtures\notes.txt",
    "application/x-msdownload"
)

print(result3)

assert result3.status == "failed"
assert result3.error is not None
assert result3.chunk_count == 0

print("OK - never raises, returns a clean failed result")


print("\n=== nonexistent file fails gracefully ===")

result4 = ingest_document(
    204,
    r"C:\tmp\fixtures\does-not-exist.pdf",
    MIME_PDF
)

print(result4)

assert result4.status == "failed"

print("OK")


print("\n=== remove_document cleans up chunks ===")

remove_document(201)

assert count_chunks_for_document(201) == 0

print("OK")


print("\nALL DIRECT INGESTION TESTS PASSED")
