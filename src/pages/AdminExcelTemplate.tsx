import { useEffect, useState } from "react";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  adminDownloadTemplate,
  adminGetTemplateInfo,
  adminUploadTemplate,
  type TemplateInfo,
} from "../lib/adminApi";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminExcelTemplate() {
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const loadTemplate = async () => {
    setIsLoading(true);
    try {
      const info = await adminGetTemplateInfo();
      setTemplateInfo(info);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to load template.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      showError("Choose an .xlsx file first.");
      return;
    }

    setIsUploading(true);
    clearToast();

    try {
      const result = await adminUploadTemplate(selectedFile);
      setTemplateInfo(result);
      setSelectedFile(null);
      showSuccess(
        "The server is now using the uploaded workbook. Existing assessments keep their previous results until recalculated.",
        "Template updated",
      );
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Upload failed.",
        "Upload failed",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    clearToast();

    try {
      await adminDownloadTemplate();
      showSuccess(
        "Open the file in desktop Excel to confirm it matches your local workbook.",
        "Download started",
      );
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Download failed.",
        "Download failed",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="admin-page-inner">
      <FeedbackToast toast={toast} onClose={clearToast} />

      <div className="admin-page-header">
        <h1 className="admin-page-title">Excel Template</h1>
        <p className="admin-page-subtitle">
          Manage the calculator workbook used for assessment calculations.
        </p>
      </div>

      <div className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2 className="admin-panel-title">Current template</h2>
          {isLoading ? (
            <p className="admin-muted">Loading template info...</p>
          ) : templateInfo ? (
            <>
              <dl className="admin-info-list">
                <div className="admin-info-row">
                  <dt>File</dt>
                  <dd>{templateInfo.fileName}</dd>
                </div>
                <div className="admin-info-row">
                  <dt>Status</dt>
                  <dd>
                    <span
                      className={`admin-status${
                        templateInfo.exists ? " is-active" : " is-missing"
                      }`}
                    >
                      <span className="admin-status-dot" aria-hidden />
                      {templateInfo.exists ? "Active" : "Missing"}
                    </span>
                  </dd>
                </div>
                <div className="admin-info-row">
                  <dt>Size</dt>
                  <dd>{templateInfo.sizeLabel ?? "—"}</dd>
                </div>
                <div className="admin-info-row">
                  <dt>Last updated</dt>
                  <dd>{formatDate(templateInfo.modifiedAt)}</dd>
                </div>
              </dl>
              <p className="admin-panel-lead">
                This is the exact workbook the server uses for calculations.
                Download it and open in desktop Excel to confirm it matches your
                local file. Existing assessments keep old results until
                recalculated.
              </p>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={!templateInfo.exists || isDownloading}
                onClick={handleDownload}
              >
                {isDownloading ? "Downloading..." : "Download current Excel"}
              </button>
            </>
          ) : (
            <p className="admin-muted">No template information.</p>
          )}
        </div>

        <div className="admin-panel">
          <h2 className="admin-panel-title">Upload new Excel template</h2>
          <p className="admin-panel-lead">
            Upload a workbook with the same sheet structure as the current
            calculator. It replaces the active template completely — any
            previous backup copies are removed. After upload, existing
            assessments keep old results until recalculated.
          </p>

          <div className="admin-field">
            <input
              type="file"
              className="admin-file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            {selectedFile && (
              <p className="admin-file-meta">
                Selected: {selectedFile.name} (
                {(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={isUploading || !selectedFile}
            onClick={handleUpload}
          >
            {isUploading ? "Uploading..." : "Upload and replace template"}
          </button>
        </div>
      </div>
    </div>
  );
}
