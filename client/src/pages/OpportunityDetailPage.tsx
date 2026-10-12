import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { fetchOpportunityById, fetchApplications, type ApplicationRecord } from "../api/api";
import type { VolunteerOpportunity } from "../types/VolunteerOpportunity";
import {
  getOpportunityImageUrl,
  useFallbackImage,
  CATEGORY_FALLBACKS,
  DEFAULT_FALLBACK,
} from "../utils/opportunityImage";

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [opportunity, setOpportunity] = useState<VolunteerOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [duplicateApplication, setDuplicateApplication] = useState<ApplicationRecord | null>(null);

  const { setSelectedOpportunity } = useAppContext();
  const { account } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    const oppId = Number(id);

    setLoading(true);
    setError("");

    Promise.all([
      fetchOpportunityById(oppId),
      account ? fetchApplications().catch(() => []) : Promise.resolve([]),
    ])
      .then(([oppData, apps]) => {
        setOpportunity(oppData);
        if (apps && Array.isArray(apps)) {
          const existing = apps.find((app) => app.volunteerId === oppId);
          if (existing) setDuplicateApplication(existing);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load opportunity details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, account]);

  function handleStartWizard() {
    if (!opportunity) return;
    setSelectedOpportunity(opportunity);
    navigate(`/signup/${opportunity.id}`);
  }

  if (loading) {
    return (
      <div className="page detail-page">
        <p className="loading-message" role="status" aria-live="polite">
          Loading opportunity details...
        </p>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="page detail-page">
        <Link to="/" className="detail-back-link">
          ← Back to all opportunities
        </Link>
        <div className="empty-state">
          <h2>Opportunity Not Found</h2>
          <p className="subtitle">{error || "The requested opportunity could not be found."}</p>
          <Link to="/" className="btn btn-secondary">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const isFull = opportunity.spotsLeft === 0;
  const hasApplied = Boolean(duplicateApplication);

  return (
    <div className="page detail-page">
      <Link to="/" className="detail-back-link">
        ← Back to all opportunities
      </Link>

      <div className="detail-hero-media">
        <img
          src={getOpportunityImageUrl(opportunity)}
          data-fallback={CATEGORY_FALLBACKS[opportunity.type] ?? DEFAULT_FALLBACK}
          onError={useFallbackImage}
          alt={`${opportunity.name} volunteers in action`}
          className="detail-hero-image"
        />
      </div>

      <header className="detail-header">
        <div className="detail-meta-row">
          <span className="badge">{opportunity.type.toUpperCase()}</span>
          {Boolean(opportunity.isPriority) && <span className="priority-badge">PRIORITY</span>}
          <span className="spots-pill">{opportunity.spotsLeft} spots left</span>
        </div>
        <h1 className="detail-title">{opportunity.name}</h1>
        <p className="detail-lead">{opportunity.description}</p>
      </header>

      <div className="detail-layout">
        <main className="detail-main">
          <section className="detail-section">
            <h2>What a Typical Session Looks Like</h2>
            <p>
              {opportunity.sessionDetails ||
                "Volunteers gather for a 15-minute briefing and materials distribution before starting the session. You will work in small teams alongside community coordinators to guide participants through hands-on activities, ensuring every attendee and fellow volunteer feels welcomed, valued, and empowered."}
            </p>
          </section>

          <section className="detail-section">
            <h2>Who You'll Be Working With</h2>
            <p>
              {opportunity.teamDetails ||
                "You'll collaborate with local grassroots leaders, fellow community volunteers, and neighborhood organizers passionate about long-term community impact. Experienced team leads are on-site at all times to mentor new volunteers and answer questions throughout your shift."}
            </p>
          </section>

          <section className="detail-section">
            <h2>What to Bring & Preparation</h2>
            <p>
              {opportunity.preparationDetails ||
                "Wear comfortable clothing and closed-toe footwear suitable for light physical activity. All tools, instructional kits, and safety gear are provided on-site upon arrival. Drinking water and light refreshments are available for all volunteers during break intervals."}
            </p>
          </section>
        </main>

        <aside className="detail-sidebar">
          <div className="detail-sidebar-card">
            <h3>Ready to Join?</h3>
            <ul className="detail-info-list">
              <li className="detail-info-item">
                <strong>Category</strong>
                <span>{opportunity.type}</span>
              </li>
              <li className="detail-info-item">
                <strong>Spots Available</strong>
                <span>{opportunity.spotsLeft} {opportunity.spotsLeft === 1 ? "spot" : "spots"}</span>
              </li>
              <li className="detail-info-item">
                <strong>Priority Status</strong>
                <span>{opportunity.isPriority ? "Urgent Need" : "Standard"}</span>
              </li>
              <li className="detail-info-item">
                <strong>Commitment</strong>
                <span>Flexible schedule</span>
              </li>
            </ul>

            {hasApplied && (
              <p className="application-notice" style={{ marginBottom: "1rem" }}>
                <span>You've already applied to this opportunity.</span>{" "}
                <Link to="/my-applications">View My Applications</Link>
              </p>
            )}

            <button
              type="button"
              className={`btn btn-block ${isFull || hasApplied ? "btn-full" : "btn-primary"}`}
              disabled={isFull || hasApplied}
              onClick={handleStartWizard}
            >
              {isFull ? "Opportunity Full" : hasApplied ? "Already Applied" : "Apply Now"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
