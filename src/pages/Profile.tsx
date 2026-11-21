import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, UserRound } from "lucide-react";
import MarketingNav from "../components/MarketingNav";
import Breadcrumbs from "../components/Breadcrumbs";
import NigeriaPhoneInput, {
  isValidNigeriaLocalPhone,
  toNigeriaE164,
} from "../components/NigeriaPhoneInput";
import PageSeo from "../components/PageSeo";
import FeedbackToast from "../components/FeedbackToast";
import SolarvyLoader from "../components/SolarvyLoader";
import { useAuth, type AuthUser } from "../context/AuthContext";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  deleteAuthAvatar,
  resolvePublicAssetUrl,
  updateAuthProfile,
  uploadAuthAvatar,
} from "../lib/authApi";
import { ApiError } from "../lib/api";
import { NIGERIA_STATE_LABELS } from "../lib/nigeriaStates";
import "../css/profile-page.css";

type ProfileFormState = {
  fullName: string;
  phoneLocal: string;
  country: string;
  region: string;
  city: string;
};

const BASE_COUNTRIES = ["Nigeria"] as const;

function getInitials(fullName?: string | null): string {
  if (!fullName?.trim()) return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function phoneLocalFromE164(phoneE164?: string | null): string {
  const digits = String(phoneE164 || "").replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length >= 13) {
    return digits.slice(3, 13);
  }
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.slice(-10);
}

function isNigeriaCountry(country?: string | null): boolean {
  return String(country || "").trim().toLowerCase() === "nigeria";
}

function formFromUser(user: AuthUser | null): ProfileFormState {
  return {
    fullName: user?.fullName || "",
    phoneLocal: phoneLocalFromE164(user?.phoneE164),
    country: user?.country || "",
    region: user?.region || "",
    city: user?.city || "",
  };
}

function countryOptionsFor(current: string): string[] {
  const options = [...BASE_COUNTRIES];
  const trimmed = current.trim();
  if (
    trimmed &&
    !options.some((c) => c.toLowerCase() === trimmed.toLowerCase())
  ) {
    options.push(trimmed);
  }
  return options;
}

function Profile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, updateUser, refreshUser } =
    useAuth();
  const { toast, showSuccess, showError, clearToast } = useFeedbackToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [form, setForm] = useState<ProfileFormState>(() => formFromUser(user));
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProfileFormState, string>>
  >({});
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    setForm(formFromUser(user));
    setErrors({});
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const initials = useMemo(() => getInitials(form.fullName), [form.fullName]);
  const savedAvatarUrl = resolvePublicAssetUrl(user?.avatarUrl);
  const displayAvatarUrl = avatarPreview || savedAvatarUrl;
  const nigeriaSelected = isNigeriaCountry(form.country);
  const countryOptions = useMemo(
    () => countryOptionsFor(form.country),
    [form.country],
  );

  const isDirty = useMemo(() => {
    const baseline = formFromUser(user);
    return (
      form.fullName.trim() !== baseline.fullName.trim() ||
      form.phoneLocal !== baseline.phoneLocal ||
      form.country !== baseline.country ||
      form.region !== baseline.region ||
      form.city.trim() !== baseline.city.trim()
    );
  }, [form, user]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  const clearAvatarPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setAvatarPreview(null);
  };

  const handleCancel = () => {
    setForm(formFromUser(user));
    setErrors({});
  };

  const updateField = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) => {
    setForm((prev) => {
      if (key === "country") {
        const country = String(value);
        const nowNigeria = isNigeriaCountry(country);
        let region = prev.region;
        if (nowNigeria && !NIGERIA_STATE_LABELS.includes(prev.region)) {
          region = "";
        }
        return { ...prev, country, region };
      }
      return { ...prev, [key]: value };
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof ProfileFormState, string>> = {};
    if (!form.fullName.trim()) {
      next.fullName = "Full name is required.";
    }
    if (!form.phoneLocal.trim()) {
      next.phoneLocal = "Phone number is required.";
    } else if (!isValidNigeriaLocalPhone(form.phoneLocal)) {
      next.phoneLocal = "Enter a valid Nigeria phone number.";
    }
    if (!form.country.trim()) {
      next.country = "Please select a country.";
    }
    if (isNigeriaCountry(form.country) && !form.region.trim()) {
      next.region = "Please select a state.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const result = await updateAuthProfile({
        fullName: form.fullName.trim(),
        phoneE164: toNigeriaE164(form.phoneLocal),
        country: form.country.trim(),
        region: form.region.trim(),
        city: form.city.trim(),
      });
      if (!result.success) {
        throw new ApiError(result.message || "Unable to update profile");
      }

      if (result.data) {
        updateUser(result.data);
      } else {
        await refreshUser();
      }
      showSuccess("Your profile has been updated.", "Profile saved");
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : "Unable to update profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = () => {
    if (avatarUploading || saving) return;
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || avatarUploading) return;

    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      showError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showError("Image must be 2MB or smaller.");
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const preview = URL.createObjectURL(file);
    previewUrlRef.current = preview;
    setAvatarPreview(preview);
    setAvatarUploading(true);

    try {
      const upload = await uploadAuthAvatar(file);
      if (!upload.success || !upload.data) {
        throw new ApiError(upload.message || "Unable to upload photo");
      }
      clearAvatarPreview();
      updateUser(upload.data);
      showSuccess("Your profile photo has been updated.", "Photo saved");
    } catch (error) {
      clearAvatarPreview();
      showError(
        error instanceof ApiError
          ? error.message
          : "Unable to upload photo. Please try again.",
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!displayAvatarUrl || avatarUploading || saving) return;
    const confirmed = window.confirm("Remove your profile photo?");
    if (!confirmed) return;

    setAvatarUploading(true);
    try {
      const removed = await deleteAuthAvatar();
      if (!removed.success || !removed.data) {
        throw new ApiError(removed.message || "Unable to remove photo");
      }
      clearAvatarPreview();
      updateUser(removed.data);
      showSuccess("Your profile photo has been removed.", "Photo removed");
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : "Unable to remove photo. Please try again.",
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const renderAvatarFace = (size: number) => {
    if (displayAvatarUrl) {
      return (
        <img src={displayAvatarUrl} alt="" className="profile-avatar-img" />
      );
    }
    if (initials) {
      return <span className="profile-avatar-initials">{initials}</span>;
    }
    return <UserRound size={size} strokeWidth={1.75} aria-hidden="true" />;
  };

  return (
    <div className="full-body-color profile-page">
      <PageSeo
        title="Profile | SolarVy"
        description="Manage your personal information and account details."
        path="/profile"
      />
      <FeedbackToast toast={toast} onClose={clearToast} />
      <SolarvyLoader open={saving} message="Saving profile..." />

      <section className="hero d-flex align-items-center ass-bannr py-4">
        <div className="overlay"></div>
        <div className="container-fluid px-lg-4 px-3 position-relative z-1 menu-div ass-div">
          <div className="row align-items-start text-divs gx-3 gx-lg-4">
            <MarketingNav />
            <div className="nav-bottom-section row align-items-center">
              <div className="col-12 col-lg-12 text-white">
                <h1 className="bannr-text display-5 ass-page">Profile</h1>
                <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                  Manage your personal information and account details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-fluid px-lg-4 py-4 profile-content">
        <Breadcrumbs />
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8 col-xl-7">
            <div className="profile-card p-4 shadow-sm rounded-4 ass-first">
              <form className="profile-edit" onSubmit={handleSave} noValidate>
                <div className="profile-edit-avatar-block">
                  <div className="profile-avatar-edit-wrap">
                    <div
                      className={`profile-avatar profile-avatar--lg${displayAvatarUrl ? " profile-avatar--photo" : ""}${avatarUploading ? " profile-avatar--uploading" : ""}`}
                    >
                      {renderAvatarFace(40)}
                      {avatarUploading ? (
                        <span
                          className="profile-avatar-upload-overlay"
                          aria-hidden="true"
                        >
                          <span className="profile-avatar-upload-spinner" />
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="profile-avatar-pencil"
                      onClick={handleAvatarPick}
                      aria-label="Change profile photo"
                      disabled={saving || avatarUploading}
                    >
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                  </div>
                  {displayAvatarUrl ? (
                    <button
                      type="button"
                      className="profile-avatar-remove"
                      onClick={handleAvatarRemove}
                      disabled={saving || avatarUploading}
                    >
                      <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
                      Remove photo
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="profile-avatar-remove"
                      onClick={handleAvatarPick}
                      disabled={saving || avatarUploading}
                    >
                      Upload photo
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="visually-hidden"
                    onChange={handleAvatarChange}
                    disabled={avatarUploading}
                  />
                </div>

                <div className="profile-fields">
                  <div className="profile-field">
                    <label
                      htmlFor="profile-fullName"
                      className="form-label ass-field-label"
                    >
                      Full name
                    </label>
                    <input
                      id="profile-fullName"
                      type="text"
                      className={`form-control ass-field-control${errors.fullName ? " is-invalid" : ""}`}
                      value={form.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      disabled={saving}
                      autoComplete="name"
                      aria-invalid={Boolean(errors.fullName)}
                    />
                    {errors.fullName ? (
                      <div className="ass-field-error">{errors.fullName}</div>
                    ) : null}
                  </div>

                  <div className="profile-field">
                    <label
                      htmlFor="profile-email"
                      className="form-label ass-field-label"
                    >
                      Email address
                    </label>
                    <input
                      id="profile-email"
                      type="email"
                      className="form-control ass-field-control"
                      value={user.email}
                      disabled
                      readOnly
                      autoComplete="email"
                    />
                    <p className="profile-field-hint">
                      Email is used for sign-in and cannot be changed here.
                    </p>
                  </div>

                  <div className="profile-field">
                    <label
                      htmlFor="profile-phone"
                      className="form-label ass-field-label"
                    >
                      Phone number
                    </label>
                    <NigeriaPhoneInput
                      id="profile-phone"
                      value={form.phoneLocal}
                      onChange={(value) => updateField("phoneLocal", value)}
                      disabled={saving}
                      hasError={Boolean(errors.phoneLocal)}
                    />
                    {errors.phoneLocal ? (
                      <div className="ass-field-error">{errors.phoneLocal}</div>
                    ) : null}
                  </div>
                </div>

                <div className="profile-fields profile-fields--grid">
                  <div className="profile-field">
                    <label
                      htmlFor="profile-country"
                      className="form-label ass-field-label"
                    >
                      Country
                    </label>
                    <select
                      id="profile-country"
                      className={`form-select ass-field-control${errors.country ? " is-invalid" : ""}`}
                      value={form.country}
                      onChange={(e) => updateField("country", e.target.value)}
                      disabled={saving}
                      aria-invalid={Boolean(errors.country)}
                    >
                      <option value="">Select country</option>
                      {countryOptions.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    {errors.country ? (
                      <div className="ass-field-error">{errors.country}</div>
                    ) : null}
                  </div>

                  <div className="profile-field">
                    <label
                      htmlFor="profile-region"
                      className="form-label ass-field-label"
                    >
                      State
                    </label>
                    {nigeriaSelected ? (
                      <select
                        id="profile-region"
                        className={`form-select ass-field-control${errors.region ? " is-invalid" : ""}`}
                        value={form.region}
                        onChange={(e) => updateField("region", e.target.value)}
                        disabled={saving}
                        aria-invalid={Boolean(errors.region)}
                      >
                        <option value="">Select state</option>
                        {NIGERIA_STATE_LABELS.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="profile-region"
                        type="text"
                        className={`form-control ass-field-control${errors.region ? " is-invalid" : ""}`}
                        value={form.region}
                        onChange={(e) => updateField("region", e.target.value)}
                        disabled={saving}
                        autoComplete="address-level1"
                        placeholder="e.g. Tamil Nadu"
                        aria-invalid={Boolean(errors.region)}
                      />
                    )}
                    {errors.region ? (
                      <div className="ass-field-error">{errors.region}</div>
                    ) : null}
                  </div>

                  <div className="profile-field profile-field--full">
                    <label
                      htmlFor="profile-city"
                      className="form-label ass-field-label"
                    >
                      City
                    </label>
                    <input
                      id="profile-city"
                      type="text"
                      className="form-control ass-field-control"
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      disabled={saving}
                      autoComplete="address-level2"
                      placeholder="e.g. Ikeja"
                    />
                  </div>
                </div>

                <div className="profile-actions">
                  <button
                    type="button"
                    className="btn-outline-custom2 profile-action-btn"
                    onClick={handleCancel}
                    disabled={saving || !isDirty}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary-custom profile-action-btn"
                    disabled={saving || !isDirty}
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Profile;
