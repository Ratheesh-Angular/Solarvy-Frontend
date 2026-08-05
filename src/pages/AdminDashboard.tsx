import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
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

export default function AdminDashboard() {
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const info = await adminGetTemplateInfo();
      setTemplateInfo(info);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to load dashboard.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
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

      <div className="mb-4">
        <h1 className="h4 fw-bold mb-1">Excel Template</h1>
        <p className="text-muted small mb-0">
          Manage the calculator workbook used for assessment calculations.
        </p>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 rounded-4 h-100">
            <div className="card-body p-4">
              <h2 className="h5 fw-bold mb-3">Current template</h2>
              {isLoading ? (
                <p className="text-muted mb-0">Loading template info...</p>
              ) : templateInfo ? (
                <>
                  <dl className="admin-info-list mb-3">
                    <div className="admin-info-row">
                      <dt>File</dt>
                      <dd>{templateInfo.fileName}</dd>
                    </div>
                    <div className="admin-info-row">
                      <dt>Status</dt>
                      <dd>{templateInfo.exists ? "Active" : "Missing"}</dd>
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
                  <p className="text-muted small mb-3">
                    This is the exact workbook the server uses for calculations.
                    Download it and open in desktop Excel to confirm it matches
                    your local file. Existing assessments keep old results until
                    recalculated.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={!templateInfo.exists || isDownloading}
                    onClick={handleDownload}
                  >
                    {isDownloading
                      ? "Downloading..."
                      : "Download current Excel"}
                  </button>
                </>
              ) : (
                <p className="text-muted mb-0">No template information.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card shadow-sm border-0 rounded-4 h-100">
            <div className="card-body p-4">
              <h2 className="h5 fw-bold mb-2">Upload new Excel template</h2>
              <p className="text-muted small mb-4">
                Upload a workbook with the same sheet structure as the current
                calculator. It replaces the active template completely — any
                previous backup copies are removed. After upload, existing
                assessments keep old results until recalculated.
              </p>

              <div className="mb-3">
                <input
                  type="file"
                  className="form-control"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) =>
                    setSelectedFile(e.target.files?.[0] ?? null)
                  }
                />
                {selectedFile && (
                  <p className="small text-muted mt-2 mb-0">
                    Selected: {selectedFile.name} (
                    {(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <button
                type="button"
                className="btn btn-danger"
                disabled={isUploading || !selectedFile}
                onClick={handleUpload}
              >
                {isUploading ? "Uploading..." : "Upload and replace template"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
