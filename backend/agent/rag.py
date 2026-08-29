from pathlib import Path
from typing import List

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from pypdf import PdfReader
from docx import Document as DocxDocument


Path("uploads").mkdir(exist_ok=True)
Path("chroma_db").mkdir(exist_ok=True)

vectorstore = Chroma(
    collection_name="agentic_chatbot_docs",
    persist_directory="chroma_db"
)


def read_file_text(file_path: str) -> str:
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
            text += "\n"
        return text

    if suffix == ".docx":
        docx_document = DocxDocument(file_path)
        return "\n".join(paragraph.text for paragraph in docx_document.paragraphs)

    if suffix in [".txt", ".md", ".py", ".csv"]:
        return path.read_text(encoding="utf-8", errors="ignore")

    raise ValueError("Unsupported file type. Upload PDF, DOCX, TXT, MD, PY, or CSV.")


def delete_source_documents(thread_id: str, source: str):
    vectorstore._chroma_collection.delete(
        where={"$and": [{"thread_id": thread_id}, {"source": source}]}
    )


def delete_thread_documents(thread_id: str):
    vectorstore._chroma_collection.delete(where={"thread_id": thread_id})


def add_document_to_rag(file_path: str, thread_id: str):
    text = read_file_text(file_path)

    if not text.strip():
        raise ValueError("No text could be extracted from this file.")

    splitter = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=150)
    chunks = splitter.split_text(text)
    source = Path(file_path).name

    delete_source_documents(thread_id, source)

    docs: List[Document] = [
        Document(page_content=chunk, metadata={"thread_id": thread_id, "source": source})
        for chunk in chunks
    ]

    vectorstore.add_documents(docs)

    return {"filename": Path(file_path).name, "chunks": len(docs)}


def retrieve_from_rag(query: str, thread_id: str, k: int = 4) -> str:
    docs = vectorstore.similarity_search(query, k=k, filter={"thread_id": thread_id})

    if not docs:
        return "No relevant uploaded document content found."

    results = []
    for i, doc in enumerate(docs, start=1):
        source = doc.metadata.get("source", "uploaded document")
        results.append(f"[Source {i}: {source}]\n{doc.page_content}")

    return "\n\n".join(results)
