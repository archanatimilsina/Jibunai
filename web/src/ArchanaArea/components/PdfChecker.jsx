import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";

const API_BASE = `${import.meta.env.VITE_API_URL}/api/pdfs/`;

const C = {
  white:    "#ffffff",
  border:   "#d8d4cc",
  green:    "#2d6a4f",
  greenLt:  "#e4f1ea",
  dark:     "#1a1a2e",
  soft:     "#7a7567",
  muted:    "#eceae3",
  danger:   "#c0392b",
  dangerLt: "#fdecea",
};

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export default function PDFManager({ onBack }) {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const fetchPdfs = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error("Couldn't load the PDF list.");
      setPdfs(await res.json());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPdfs();
  }, []);

  useEffect(() => {
    if (!previewDoc) return;
    const onKey = (e) => e.key === "Escape" && setPreviewDoc(null);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [previewDoc]);

  const resetForm = () => {
    setTitle("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) {
      setError("Give it a title and choose a PDF file first.");
      return;
    }
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch(API_BASE, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed. Check the file is a PDF.");
      resetForm();
      setError("");
      fetchPdfs({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}${doc.id}/`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setPdfs((prev) => prev.filter((p) => p.id !== doc.id));
      if (previewDoc?.id === doc.id) setPreviewDoc(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownload = (doc) => {
    const link = document.createElement("a");
    link.href = doc.download_url;
    link.setAttribute("download", `${doc.title}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const formatMeta = (doc) => {
    const parts = [];
    if (doc.size_kb) parts.push(`${doc.size_kb} KB`);
    if (doc.uploaded_at) {
      parts.push(`uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}`);
    }
    return parts.join(" · ");
  };

  return (
    <ContentWrap>
      <PageHeader>
        <HeaderText>
          <SectionLabel>PDF Library</SectionLabel>
          <PageTitle>Documents &amp; <em>Resources</em></PageTitle>
          <PageDesc>Upload, preview and manage your PDF collection.</PageDesc>
        </HeaderText>
        {onBack && (
          <BackButton type="button" onClick={onBack}>
            ← Back
          </BackButton>
        )}
      </PageHeader>

      <UploadForm onSubmit={handleUpload}>
        <FormGroup>
          <FormLabel htmlFor="pdf-title">Title</FormLabel>
          <TextInput
            id="pdf-title"
            type="text"
            placeholder="Document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
          />
        </FormGroup>

        <FormGroup>
          <FormLabel htmlFor="pdf-file">PDF file</FormLabel>
          <FileRow>
            <input
              id="pdf-file"
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0] || null)}
              hidden
            />
            <FilePickButton type="button" onClick={() => fileInputRef.current?.click()}>
              Choose file
            </FilePickButton>
            <FileName $empty={!file} title={file?.name}>
              {file ? file.name : "No file selected"}
            </FileName>
          </FileRow>
        </FormGroup>

        <ButtonRow>
          <PrimaryButton type="submit" disabled={uploading}>
            {uploading && <Spinner />}
            {uploading ? "Uploading…" : "Upload"}
          </PrimaryButton>
        </ButtonRow>
      </UploadForm>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <LoadingRow>
          <Spinner $large />
          <LoadingText>Loading documents…</LoadingText>
        </LoadingRow>
      ) : pdfs.length === 0 ? (
        <EmptyState>No PDFs saved yet. Upload one above.</EmptyState>
      ) : (
        <DocList>
          {pdfs.map((doc) => (
            <DocCard key={doc.id}>
              <DocIcon aria-hidden="true">📄</DocIcon>
              <DocInfo>
                <DocTitle title={doc.title}>{doc.title}</DocTitle>
                <DocMeta>{formatMeta(doc)}</DocMeta>
              </DocInfo>
              <DocActions>
                <ActionButton type="button" onClick={() => setPreviewDoc(doc)}>
                  Preview
                </ActionButton>
                <ActionButton type="button" onClick={() => handleDownload(doc)}>
                  Download
                </ActionButton>
                <ActionButton type="button" $danger onClick={() => handleDelete(doc)}>
                  Delete
                </ActionButton>
              </DocActions>
            </DocCard>
          ))}
        </DocList>
      )}

      {previewDoc && (
        <Overlay onClick={() => setPreviewDoc(null)}>
          <Modal role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle title={previewDoc.title}>{previewDoc.title}</ModalTitle>
              <ModalClose type="button" onClick={() => setPreviewDoc(null)}>
                ✕
              </ModalClose>
            </ModalHeader>
            <ModalBody>
              <iframe src={previewDoc.file_url} title={previewDoc.title} />
            </ModalBody>
          </Modal>
        </Overlay>
      )}
    </ContentWrap>
  );
}

const ContentWrap = styled.div`
  max-width: 760px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  animation: ${fadeUp} 0.4s ease forwards;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 2rem;
  @media (max-width: 500px) {
    flex-direction: column-reverse;
    align-items: stretch;
  }
`;

const HeaderText = styled.div``;

const SectionLabel = styled.span`
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${C.green};
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 0.4rem;
`;

const PageTitle = styled.h1`
  font-size: clamp(1.7rem, 4vw, 2.2rem);
  font-weight: 800;
  color: ${C.dark};
  line-height: 1.15;
  margin: 0 0 0.5rem;
  em { font-style: normal; color: ${C.green}; }
`;

const PageDesc = styled.p`
  color: ${C.soft};
  font-size: 0.95rem;
  margin: 0;
`;

const BackButton = styled.button`
  font-size: 0.85rem;
  font-weight: 700;
  background: transparent;
  color: ${C.dark};
  border: 1.5px solid ${C.border};
  padding: 0.5rem 1rem;
  border-radius: 100px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  &:hover {
    background: ${C.dark};
    color: ${C.white};
    border-color: ${C.dark};
  }
`;

const UploadForm = styled.form`
  background: ${C.muted};
  border: 1.5px solid ${C.border};
  border-radius: 14px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  animation: ${fadeUp} 0.3s ease;
  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
`;

const FormLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${C.soft};
`;

const TextInput = styled.input`
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid ${C.border};
  border-radius: 10px;
  background: ${C.white};
  font-size: 0.92rem;
  color: ${C.dark};
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  &::placeholder { color: #a1a1aa; }
  &:focus {
    border-color: ${C.green};
    box-shadow: 0 0 0 3px ${C.greenLt};
  }
  &:disabled { opacity: 0.6; }
`;

const FileRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
`;

const FilePickButton = styled.button`
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 700;
  background: ${C.white};
  color: ${C.dark};
  border: 1.5px solid ${C.border};
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { border-color: ${C.green}; color: ${C.green}; }
`;

const FileName = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
  color: ${(p) => (p.$empty ? "#a1a1aa" : C.dark)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ButtonRow = styled.div`
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  background: ${C.green};
  color: ${C.white};
  border: 1.5px solid ${C.green};
  padding: 0.65rem 1.4rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover:not(:disabled) {
    background: #0ea371;
    border-color: #0ea371;
  }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorBanner = styled.div`
  background: ${C.dangerLt};
  border: 1.5px solid #f3a5a0;
  color: ${C.danger};
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-size: 0.88rem;
  margin-bottom: 1.25rem;
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 2rem 0;
`;

const LoadingText = styled.p`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${C.soft};
  margin: 0;
`;

const EmptyState = styled.div`
  text-align: center;
  color: ${C.soft};
  font-size: 0.95rem;
  padding: 3rem 1.5rem;
  border: 1.5px dashed ${C.border};
  border-radius: 14px;
`;

const DocList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const DocCard = styled.div`
  display: flex;
  align-items: center;
  gap: 0.9rem;
  background: ${C.white};
  border: 1.5px solid ${C.border};
  border-radius: 14px;
  padding: 0.9rem 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  animation: ${fadeUp} 0.3s ease;
  &:hover {
    border-color: ${C.green};
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.08);
  }
  @media (max-width: 560px) {
    flex-wrap: wrap;
  }
`;

const DocIcon = styled.span`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  background: ${C.greenLt};
  border-radius: 10px;
`;

const DocInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DocTitle = styled.p`
  font-weight: 700;
  font-size: 0.95rem;
  color: ${C.dark};
  margin: 0;
  overflow-wrap: anywhere;
`;

const DocMeta = styled.p`
  font-size: 0.78rem;
  color: ${C.soft};
  margin: 0.15rem 0 0;
`;

const DocActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  @media (max-width: 560px) {
    width: 100%;
  }
`;

const ActionButton = styled.button`
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  background: ${C.white};
  color: ${(p) => (p.$danger ? C.danger : C.dark)};
  border: 1.5px solid ${(p) => (p.$danger ? "#f3a5a0" : C.border)};
  padding: 0.4rem 0.75rem;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: ${(p) => (p.$danger ? C.danger : C.dark)};
    color: ${C.white};
    border-color: ${(p) => (p.$danger ? C.danger : C.dark)};
  }
  @media (max-width: 560px) {
    flex: 1;
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(24, 24, 27, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  z-index: 999;
  animation: ${fadeUp} 0.2s ease;
`;

const Modal = styled.div`
  background: ${C.white};
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  height: min(85vh, 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(24, 24, 27, 0.25);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  border-bottom: 1.5px solid ${C.border};
`;

const ModalTitle = styled.span`
  font-weight: 700;
  font-size: 0.95rem;
  color: ${C.dark};
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ModalClose = styled.button`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid ${C.border};
  background: ${C.white};
  color: ${C.soft};
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: ${C.dark};
    color: ${C.white};
    border-color: ${C.dark};
  }
`;

const ModalBody = styled.div`
  flex: 1;
  min-height: 0;
  iframe {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }
`;

const Spinner = styled.span`
  display: inline-block;
  width: ${(p) => (p.$large ? "18px" : "13px")};
  height: ${(p) => (p.$large ? "18px" : "13px")};
  border: 2px solid ${(p) => (p.$large ? C.border : "rgba(255,255,255,0.45)")};
  border-top-color: ${(p) => (p.$large ? C.green : C.white)};
  border-radius: 50%;
  animation: ${spin} 0.65s linear infinite;
  flex-shrink: 0;
`;
