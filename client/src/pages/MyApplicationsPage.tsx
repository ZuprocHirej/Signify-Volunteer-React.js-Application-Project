import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchApplications, deleteApplication, type ApplicationRecord } from "../api/api";
import { useFetch } from "../hooks/useFetch";

function getStatusLabel(status: ApplicationRecord["status"]) {
  return status === "approved" ? "Confirmed" : status === "rejected" ? "Cancelled" : "Pending";
}

function MyApplicationsPage() {
  const {
    data: applications,
    loading,
    error: loadError,
    setData,
  } = useFetch<ApplicationRecord[]>(fetchApplications, []);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const applicationList = applications ?? [];

  async function handleDelete(id: number, roleName: string) {
    const confirmed = window.confirm(
      `Are you sure you want to withdraw your application for "${roleName}"? This will free up the spot for another volunteer.`
    );
    if (!confirmed) return;

    setDeletingId(id);
    setActionError("");
    setActionSuccess("");

    try {
      await deleteApplication(id);
      setData((prev) => (prev ? prev.filter((item) => item.id !== id) : []));
      setActionSuccess(`Application for "${roleName}" has been successfully withdrawn.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to withdraw application.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page page-wide" aria-busy={loading}>
      <h1 className="page-title">My Applications</h1>
      <p className="page-subtitle">Track and manage your submitted volunteer commitments.</p>

      {loading && <p className="loading-message" role="status" aria-live="polite">Loading applications...</p>}
      {loadError && <p className="error" role="alert">{loadError}</p>}
      {actionError && <p className="error" role="alert">{actionError}</p>}
      {actionSuccess && <p className="success-banner" role="status">{actionSuccess}</p>}

      {!loading && !loadError && applicationList.length === 0 && (
        <div className="empty-state">
          <p className="eyebrow">Your journey starts here</p>
          <h2>No applications yet</h2>
          <p className="subtitle">You haven't submitted any applications yet.</p>
          <Link to="/" className="btn btn-primary">Browse opportunities</Link>
        </div>
      )}

      <div className="applications-list">
        {applicationList.map((app) => (
          <div className="application-card" key={app.id}>
            <div className="opportunity-card-header">
              <span className="badge">{app.volunteerType.toUpperCase()}</span>
              <div className="application-meta">
                <span className={`status-tag status-${app.status}`}>{getStatusLabel(app.status)}</span>
                <span className="spots-pill">Submitted {new Date(app.submittedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <h3>{app.volunteerName}</h3>
            <p><strong>Applicant:</strong> {app.firstName} {app.lastName}</p>
            <p><strong>Email:</strong> {app.email} &nbsp;|&nbsp; <strong>Phone:</strong> {app.phone}</p>
            {(app.age || app.city) && (
              <p>
                {app.age && <><strong>Age:</strong> {app.age} &nbsp;</>}
                {app.city && <><strong>City:</strong> {app.city}</>}
              </p>
            )}
            <p>
              <strong>Availability:</strong>{" "}
              {app.availability.length > 0
                ? app.availability.map((s) => s.replace("-", " ")).join(", ")
                : "None specified"}
            </p>
            {app.skills.length > 0 && (
              <p><strong>Skills:</strong> {app.skills.join(", ")}</p>
            )}

            <div className="card-actions" style={{ marginTop: "var(--space-md, 1rem)", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={deletingId === app.id}
                onClick={() => handleDelete(app.id, app.volunteerName)}
                aria-label={`Withdraw application for ${app.volunteerName}`}
              >
                {deletingId === app.id ? "Withdrawing..." : "Withdraw Application"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyApplicationsPage;
