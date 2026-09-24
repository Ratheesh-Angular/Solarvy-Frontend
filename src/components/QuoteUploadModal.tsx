import { useEffect, useRef, useState } from "react";
import { apiPostFormData, ApiError } from "../lib/api";

type QuoteUploadModalProps = {
  open: boolean;
  onClose: () => void;
  assessmentId?: string;
  onSuccess?: (fileName: string) => void;
};

const EMPTY_FORM = {
  fullName: "",
  phoneNumber: "",
  email: "",
  location: "",
  additionalNotes: "",
};

export default function QuoteUploadModal({
  open,
  onClose,
  assessmentId,
  onSuccess,
}: QuoteUploadModalProps) {
  const quoteFileInputRef = useRef<HTMLInputElement>(null);
  const [quoteForm, setQuoteForm] = useState(EMPTY_FORM);
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [quoteUploading, setQuoteUploading] = useState(false);
  const [quoteModalError, setQuoteModalError] = useState<string | null>(null);

  const resetQuoteModal = () => {
    setQuoteForm(EMPTY_FORM);
    setQuoteFile(null);
    setQuoteModalError(null);
    if (quoteFileInputRef.current) {
      quoteFileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!open) {
      resetQuoteModal();
    }
  }, [open]);

  const handleClose = () => {
    if (quoteUploading) return;
    onClose();
  };

  const handleQuoteFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setQuoteForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuoteModalFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    setQuoteFile(file);
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteFile) {
      setQuoteModalError("Please upload an installer quote file.");
      return;
    }

    setQuoteUploading(true);
    setQuoteModalError(null);

    try {
      const formData = new FormData();
      formData.append("file", quoteFile);
      formData.append("fullName", quoteForm.fullName.trim());
      formData.append("phoneNumber", quoteForm.phoneNumber.trim());
      formData.append("email", quoteForm.email.trim());
      formData.append("location", quoteForm.location.trim());
      formData.append("additionalNotes", quoteForm.additionalNotes.trim());
      formData.append("path", window.location.pathname + window.location.search);
      if (assessmentId) {
        formData.append("assessmentId", assessmentId);
      }
      await apiPostFormData("/quote-uploads", formData);
      const fileName = quoteFile.name;
      onClose();
      onSuccess?.(fileName);
    } catch (error) {
      setQuoteModalError(
        error instanceof ApiError
          ? error.message
          : "Unable to upload quote. Please try again.",
      );
    } finally {
      setQuoteUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="quote-upload-modal-overlay" role="presentation">
      <div
        className="quote-upload-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-upload-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="quote-upload-modal-header">
          <h5 id="quote-upload-modal-title">Upload installer quote</h5>
          <button
            type="button"
            className="quote-upload-modal-close"
            aria-label="Close"
            disabled={quoteUploading}
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleQuoteSubmit}>
          <div className="quote-upload-modal-body">
            <div className="mb-3">
              <label className="form-label ass-field-label" htmlFor="quote-fullName">
                Full Name
              </label>
              <input
                id="quote-fullName"
                type="text"
                name="fullName"
                value={quoteForm.fullName}
                onChange={handleQuoteFormChange}
                className="form-control ass-field-control"
                placeholder="Your full name"
                required
                disabled={quoteUploading}
              />
            </div>

            <div className="mb-3">
              <label
                className="form-label ass-field-label"
                htmlFor="quote-phoneNumber"
              >
                Phone Number
              </label>
              <input
                id="quote-phoneNumber"
                type="tel"
                name="phoneNumber"
                value={quoteForm.phoneNumber}
                onChange={handleQuoteFormChange}
                className="form-control ass-field-control"
                placeholder="+234..."
                required
                disabled={quoteUploading}
              />
            </div>

            <div className="mb-3">
              <label className="form-label ass-field-label" htmlFor="quote-email">
                Email Address
              </label>
              <input
                id="quote-email"
                type="email"
                name="email"
                value={quoteForm.email}
                onChange={handleQuoteFormChange}
                className="form-control ass-field-control"
                placeholder="name@email.com"
                required
                disabled={quoteUploading}
              />
            </div>

            <div className="mb-3">
              <label className="form-label ass-field-label" htmlFor="quote-location">
                Location
              </label>
              <input
                id="quote-location"
                type="text"
                name="location"
                value={quoteForm.location}
                onChange={handleQuoteFormChange}
                className="form-control ass-field-control"
                placeholder="City / State"
                required
                disabled={quoteUploading}
              />
            </div>

            <div className="mb-3">
              <label className="form-label ass-field-label" htmlFor="quote-file">
                Upload Installer Quote
              </label>
              <input
                id="quote-file"
                ref={quoteFileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                className="form-control ass-field-control"
                onChange={handleQuoteModalFileChange}
                required
                disabled={quoteUploading}
              />
              <p className="upload-desc mb-0 mt-1">
                PDF, image, or document (max 15MB)
              </p>
            </div>

            <div className="mb-3">
              <label
                className="form-label ass-field-label"
                htmlFor="quote-additionalNotes"
              >
                Additional Notes (Optional)
              </label>
              <textarea
                id="quote-additionalNotes"
                name="additionalNotes"
                value={quoteForm.additionalNotes}
                onChange={handleQuoteFormChange}
                className="form-control ass-field-control"
                rows={4}
                placeholder="Example: I received a quote and want confirmation before proceeding"
                disabled={quoteUploading}
              />
            </div>

            {quoteModalError ? (
              <p className="text-danger small mb-0">{quoteModalError}</p>
            ) : null}
          </div>

          <div className="quote-upload-modal-footer">
            <button
              type="button"
              className="quote-upload-modal-cancel"
              disabled={quoteUploading}
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="quote-upload-modal-submit"
              disabled={quoteUploading}
            >
              {quoteUploading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
