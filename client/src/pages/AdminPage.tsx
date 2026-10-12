import { useEffect, useState } from "react";
import {
  createAdminOpportunity,
  createAdminTestimonial,
  deleteAdminApplication,
  deleteAdminOpportunity,
  deleteAdminTestimonial,
  fetchAdminApplications,
  fetchAdminOpportunities,
  fetchAdminSiteSettings,
  fetchAdminTestimonials,
  updateAdminApplicationStatus,
  updateAdminOpportunity,
  updateAdminSiteSettings,
  updateAdminTestimonial,
  type AdminApplication,
  type AdminOpportunity,
  type SiteSettingsRecord,
  type TestimonialRecord,
} from "../api/api";
import {
  getOpportunityImageUrl,
  useFallbackImage,
  CATEGORY_FALLBACKS,
  DEFAULT_FALLBACK,
} from "../utils/opportunityImage";

type OpportunityForm = Omit<AdminOpportunity, "id">;
type AdminTab = "opportunities" | "applications" | "testimonials" | "settings";
type ApplicationStatus = AdminApplication["status"];

const emptyForm: OpportunityForm = {
  name: "",
  type: "",
  description: "",
  spotsLeft: 0,
  imageUrl: "",
  isPriority: false,
  sessionDetails: "",
  teamDetails: "",
  preparationDetails: "",
};

const emptyTestimonialForm = {
  quote: "",
  author: "",
  role: "",
};

const statusFilters: Array<"all" | ApplicationStatus> = ["pending", "approved", "rejected", "all"];
const applicationsPerPage = 15;

function getStatusLabel(status: ApplicationStatus) {
  return status === "approved" ? "Confirmed" : status === "rejected" ? "Cancelled" : "Pending";
}

function AdminPage() {
  const [opportunities, setOpportunities] = useState<AdminOpportunity[]>([]);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettingsRecord>({
    missionStatement:
      "Signify connects everyday Filipinos with local volunteer opportunities that need them most. No experience required, just a few hours and a willingness to help.",
    stats: [
      { value: "500+", label: "Volunteers Placed" },
      { value: "40+", label: "Partner Organizations" },
      { value: "12,000+", label: "Hours Contributed" },
    ],
  });

  const [form, setForm] = useState<OpportunityForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [testimonialForm, setTestimonialForm] = useState(emptyTestimonialForm);
  const [editingTestimonialId, setEditingTestimonialId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("opportunities");

  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all");
  const [applicationSearch, setApplicationSearch] = useState("");
  const [applicationPage, setApplicationPage] = useState(1);
  const [expandedApplications, setExpandedApplications] = useState<Set<number>>(new Set());

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const [opportunityData, applicationData, testimonialData, settingsData] =
        await Promise.all([
          fetchAdminOpportunities(),
          fetchAdminApplications(),
          fetchAdminTestimonials(),
          fetchAdminSiteSettings(),
        ]);
      setOpportunities(opportunityData);
      setApplications(applicationData);
      setTestimonials(testimonialData);
      if (settingsData && settingsData.stats && settingsData.stats.length > 0) {
        setSiteSettings(settingsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // ── Opportunity Handlers ───────────────────────────────────────────────────

  function updateField(field: keyof OpportunityForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: field === "spotsLeft" ? Number(value) : value,
    }));
  }

  function startEdit(opportunity: AdminOpportunity) {
    setEditingId(opportunity.id);
    setForm({
      name: opportunity.name,
      type: opportunity.type,
      description: opportunity.description,
      spotsLeft: opportunity.spotsLeft,
      imageUrl: opportunity.imageUrl ?? "",
      isPriority: Boolean(opportunity.isPriority),
      sessionDetails: opportunity.sessionDetails ?? "",
      teamDetails: opportunity.teamDetails ?? "",
      preparationDetails: opportunity.preparationDetails ?? "",
    });
    setNotice("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function togglePriority(id: number, isPriority: boolean) {
    setError("");
    setNotice("");
    try {
      await updateAdminOpportunity(id, { isPriority });
      setNotice(isPriority ? "Opportunity marked as priority." : "Priority status removed.");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update priority status.");
    }
  }

  async function saveOpportunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const payload = {
        ...form,
        imageUrl: form.imageUrl?.trim() || null,
        sessionDetails: form.sessionDetails?.trim() || null,
        teamDetails: form.teamDetails?.trim() || null,
        preparationDetails: form.preparationDetails?.trim() || null,
      };

      if (editingId === null) {
        await createAdminOpportunity(payload);
        setNotice("Opportunity created.");
      } else {
        await updateAdminOpportunity(editingId, payload);
        setNotice("Opportunity updated.");
      }
      resetForm();
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save opportunity.");
    }
  }

  async function removeOpportunity(id: number) {
    if (!window.confirm("Delete this opportunity? Opportunities with applications cannot be deleted.")) return;
    setError("");
    try {
      await deleteAdminOpportunity(id);
      setNotice("Opportunity deleted.");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete opportunity.");
    }
  }

  // ── Testimonial Handlers ───────────────────────────────────────────────────

  function startEditTestimonial(t: TestimonialRecord) {
    setEditingTestimonialId(t.id);
    setTestimonialForm({
      quote: t.quote,
      author: t.author,
      role: t.role,
    });
    setNotice("");
  }

  function resetTestimonialForm() {
    setEditingTestimonialId(null);
    setTestimonialForm(emptyTestimonialForm);
  }

  async function saveTestimonial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      if (editingTestimonialId === null) {
        await createAdminTestimonial(testimonialForm);
        setNotice("Volunteer story added successfully.");
      } else {
        await updateAdminTestimonial(editingTestimonialId, testimonialForm);
        setNotice("Volunteer story updated successfully.");
      }
      resetTestimonialForm();
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save volunteer story.");
    }
  }

  async function removeTestimonial(id: number) {
    if (!window.confirm("Delete this volunteer story?")) return;
    setError("");
    try {
      await deleteAdminTestimonial(id);
      setNotice("Volunteer story deleted.");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete volunteer story.");
    }
  }

  // ── Site Settings Handlers ─────────────────────────────────────────────────

  function updateStat(index: number, field: "value" | "label", val: string) {
    setSiteSettings((curr) => {
      const nextStats = [...curr.stats];
      nextStats[index] = { ...nextStats[index], [field]: val };
      return { ...curr, stats: nextStats };
    });
  }

  async function saveSiteSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSavingSettings(true);
    try {
      const updated = await updateAdminSiteSettings(siteSettings);
      setSiteSettings(updated);
      setNotice("Mission statement and impact stats updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save site settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  // ── Application Handlers ───────────────────────────────────────────────────

  async function removeApplication(id: number) {
    if (!window.confirm("Delete this application and return its spot to the opportunity?")) return;
    setError("");
    try {
      await deleteAdminApplication(id);
      setNotice("Application deleted and the opportunity spot was restored.");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete application.");
    }
  }

  async function changeApplicationStatus(id: number, status: ApplicationStatus) {
    setError("");
    try {
      await updateAdminApplicationStatus(id, status);
      setApplications((current) =>
        current.map((application) =>
          application.id === id ? { ...application, status } : application
        )
      );
      setNotice("Application status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update application status.");
    }
  }

  function toggleApplication(id: number) {
    setExpandedApplications((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const normalizedSearch = applicationSearch.trim().toLowerCase();
  const filteredApplications = applications.filter((application) => {
    const matchesStatus = statusFilter === "all" || application.status === statusFilter;
    const applicant = `${application.firstName} ${application.lastName} ${application.email}`.toLowerCase();
    return matchesStatus && applicant.includes(normalizedSearch);
  });
  const totalApplicationPages = Math.max(
    1,
    Math.ceil(filteredApplications.length / applicationsPerPage)
  );
  const visibleApplications = filteredApplications.slice(
    (applicationPage - 1) * applicationsPerPage,
    applicationPage * applicationsPerPage
  );

  function selectStatus(status: "all" | ApplicationStatus) {
    setStatusFilter(status);
    setApplicationPage(1);
  }

  return (
    <div className="page page-wide admin-page">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">
            Manage opportunities, volunteer applications, homepage stories, and impact statistics.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={loadDashboard}
          disabled={loading}
        >
          Refresh data
        </button>
      </div>

      {error && <p className="error admin-message">{error}</p>}
      {notice && <p className="success admin-message">{notice}</p>}
      {loading && <p className="loading-message">Loading admin data...</p>}

      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "opportunities"}
          className={`admin-tab ${activeTab === "opportunities" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("opportunities")}
        >
          Opportunities <span className="tab-count">{opportunities.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "applications"}
          className={`admin-tab ${activeTab === "applications" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("applications")}
        >
          Applications <span className="tab-count">{applications.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "testimonials"}
          className={`admin-tab ${activeTab === "testimonials" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("testimonials")}
        >
          Volunteer Stories <span className="tab-count">{testimonials.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "settings"}
          className={`admin-tab ${activeTab === "settings" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Impact & Mission
        </button>
      </div>

      {/* ── Tab 1: Opportunities ───────────────────────────────────────────── */}
      {activeTab === "opportunities" && (
        <section className="admin-section" role="tabpanel">
          <div className="admin-section-header">
            <div>
              <h2>Volunteer opportunities</h2>
              <p className="subtitle">
                Create, edit, or configure the roles, priorities, and storytelling detail copy.
              </p>
            </div>
            {editingId !== null && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>

          <form className="admin-form" onSubmit={saveOpportunity}>
            <label>
              Role Title
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Community Tutor"
                required
              />
            </label>
            <label>
              Category
              <input
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
                placeholder="Education"
                required
              />
            </label>
            <label>
              Spots Left
              <input
                type="number"
                min="0"
                value={form.spotsLeft}
                onChange={(event) => updateField("spotsLeft", event.target.value)}
                required
              />
            </label>
            <label className="admin-form-full">
              Photo URL
              <input
                type="url"
                value={form.imageUrl ?? ""}
                onChange={(event) => updateField("imageUrl", event.target.value)}
                placeholder="https://example.com/volunteer-photo.jpg"
                maxLength={500}
              />
              {form.imageUrl?.trim() && (
                <img
                  className="admin-image-preview"
                  src={form.imageUrl.trim()}
                  alt="Opportunity preview"
                  onError={useFallbackImage}
                />
              )}
            </label>
            <label className="admin-form-full admin-checkbox-label">
              <input
                type="checkbox"
                checked={Boolean(form.isPriority)}
                onChange={(event) =>
                  setForm((curr) => ({ ...curr, isPriority: event.target.checked }))
                }
              />
              Feature as Urgent / Priority on the Home Page
            </label>
            <label className="admin-form-full">
              Overview Description (Card & Detail Hero)
              <textarea
                rows={2}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Brief summary of the opportunity for preview cards."
              />
            </label>

            {/* Storytelling detail fields for OpportunityDetailPage */}
            <div className="admin-form-group">
              <h3>Detail Page Experience & Preparation</h3>
              <p>
                Enrich this role with realistic expectations, team culture, and preparation instructions for the dedicated detail page.
              </p>
              <div className="admin-form-grid-3">
                <label>
                  Typical Session Breakdown
                  <textarea
                    rows={4}
                    value={form.sessionDetails ?? ""}
                    onChange={(event) => updateField("sessionDetails", event.target.value)}
                    placeholder="Briefing schedule, shift routine, group debrief..."
                  />
                </label>
                <label>
                  Who You'll Work With
                  <textarea
                    rows={4}
                    value={form.teamDetails ?? ""}
                    onChange={(event) => updateField("teamDetails", event.target.value)}
                    placeholder="Team size, mentorship, community organizers..."
                  />
                </label>
                <label>
                  What to Bring & Preparation
                  <textarea
                    rows={4}
                    value={form.preparationDetails ?? ""}
                    onChange={(event) => updateField("preparationDetails", event.target.value)}
                    placeholder="Attire, footwear, tools provided, water bottle..."
                  />
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              {editingId === null ? "Create opportunity" : "Save changes"}
            </button>
          </form>

          <div className="admin-list">
            {opportunities.map((opportunity) => (
              <article className="admin-row" key={opportunity.id}>
                <img
                  className="admin-row-thumb"
                  src={getOpportunityImageUrl(opportunity)}
                  data-fallback={CATEGORY_FALLBACKS[opportunity.type] ?? DEFAULT_FALLBACK}
                  alt=""
                  onError={useFallbackImage}
                  loading="eager"
                  decoding="async"
                />
                <div className="admin-row-body">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <strong>{opportunity.name}</strong>
                    {opportunity.isPriority && <span className="priority-badge">Priority</span>}
                  </div>
                  <span className="admin-row-meta">
                    {opportunity.type} · {opportunity.spotsLeft} spots left
                  </span>
                  <p>{opportunity.description}</p>
                  {(opportunity.sessionDetails || opportunity.teamDetails || opportunity.preparationDetails) && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "0.5rem",
                        fontSize: "0.78rem",
                        color: "var(--primary)",
                        fontWeight: 600,
                      }}
                    >
                      ✓ Custom storytelling sections configured
                    </span>
                  )}
                </div>
                <div className="actions admin-row-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => togglePriority(opportunity.id, !opportunity.isPriority)}
                  >
                    {opportunity.isPriority ? "Remove priority" : "Set as priority"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => startEdit(opportunity)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => removeOpportunity(opportunity.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Tab 2: Applications ────────────────────────────────────────────── */}
      {activeTab === "applications" && (
        <section className="admin-section" role="tabpanel">
          <div className="admin-section-header">
            <div>
              <h2>Applications</h2>
              <p className="subtitle">Review, filter, and update submitted volunteer applications.</p>
            </div>
            <span className="badge">{filteredApplications.length} matching</span>
          </div>

          <div className="application-controls">
            <input
              aria-label="Search applications"
              placeholder="Search applicant name or email..."
              value={applicationSearch}
              onChange={(event) => {
                setApplicationSearch(event.target.value);
                setApplicationPage(1);
              }}
            />
            <div className="status-filters" role="group" aria-label="Application status filter">
              {statusFilters.map((status) => (
                <button
                  type="button"
                  key={status}
                  className={`chip ${statusFilter === status ? "chip-active" : ""}`}
                  onClick={() => selectStatus(status)}
                >
                  {status === "all" ? "All" : getStatusLabel(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-list application-list">
            {visibleApplications.length === 0 && (
              <p className="subtitle">No applications match these filters.</p>
            )}
            {visibleApplications.map((application) => {
              const expanded = expandedApplications.has(application.id);
              return (
                <article
                  className={`admin-row application-row ${
                    expanded ? "application-row-expanded" : ""
                  }`}
                  key={application.id}
                >
                  <button
                    type="button"
                    className="application-summary"
                    onClick={() => toggleApplication(application.id)}
                    aria-expanded={expanded}
                  >
                    <span>
                      <strong>
                        {application.firstName} {application.lastName}
                      </strong>
                      <small>
                        {application.volunteerName} · {application.email}
                      </small>
                    </span>
                    <span className={`status-tag status-${application.status}`}>
                      {getStatusLabel(application.status)}
                    </span>
                    <span className="expand-mark" aria-hidden="true">
                      {expanded ? "−" : "+"}
                    </span>
                  </button>

                  {expanded && (
                    <div className="application-details">
                      <div>
                        <strong>Phone</strong>
                        <span>{application.phone || "Not provided"}</span>
                      </div>
                      <div>
                        <strong>City / Age</strong>
                        <span>
                          {application.city || "Not provided"}{" "}
                          {application.age ? `· ${application.age}` : ""}
                        </span>
                      </div>
                      <div>
                        <strong>Availability</strong>
                        <span>{application.availability.join(", ") || "None specified"}</span>
                      </div>
                      <div>
                        <strong>Skills</strong>
                        <span>{application.skills.join(", ") || "None specified"}</span>
                      </div>
                      <div>
                        <strong>Experience</strong>
                        <span>{application.experience || "None specified"}</span>
                      </div>
                      <div>
                        <strong>Heard about</strong>
                        <span>{application.heardAbout || "Not specified"}</span>
                      </div>
                      <div className="application-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => changeApplicationStatus(application.id, "approved")}
                          disabled={application.status === "approved"}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => changeApplicationStatus(application.id, "rejected")}
                          disabled={application.status === "rejected"}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => removeApplication(application.id)}
                        >
                          Delete application
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="pagination" aria-label="Applications pagination">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={applicationPage === 1}
              onClick={() => setApplicationPage((page) => page - 1)}
            >
              Previous
            </button>
            <span>
              Page {applicationPage} of {totalApplicationPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={applicationPage === totalApplicationPages}
              onClick={() => setApplicationPage((page) => page + 1)}
            >
              Next
            </button>
          </div>
        </section>
      )}

      {/* ── Tab 3: Volunteer Stories (Testimonials) ─────────────────────────── */}
      {activeTab === "testimonials" && (
        <section className="admin-section" role="tabpanel">
          <div className="admin-section-header">
            <div>
              <h2>Volunteer Stories & Testimonials</h2>
              <p className="subtitle">
                Add, edit, or remove first-person quotes featured in the homepage "Voices of Bayanihan" section.
              </p>
            </div>
            {editingTestimonialId !== null && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetTestimonialForm}
              >
                Cancel edit
              </button>
            )}
          </div>

          <form className="admin-form" onSubmit={saveTestimonial}>
            <label className="admin-form-full">
              Quote
              <textarea
                rows={3}
                value={testimonialForm.quote}
                onChange={(e) =>
                  setTestimonialForm((curr) => ({ ...curr, quote: e.target.value }))
                }
                placeholder="Tutoring in Tondo completely shifted my Saturday mornings..."
                required
              />
            </label>
            <label>
              Volunteer Name
              <input
                value={testimonialForm.author}
                onChange={(e) =>
                  setTestimonialForm((curr) => ({ ...curr, author: e.target.value }))
                }
                placeholder="Maya Santos"
                required
              />
            </label>
            <label className="admin-form-wide">
              Role / Context
              <input
                value={testimonialForm.role}
                onChange={(e) =>
                  setTestimonialForm((curr) => ({ ...curr, role: e.target.value }))
                }
                placeholder="Community Tutor since 2023"
                required
              />
            </label>
            <button type="submit" className="btn btn-primary">
              {editingTestimonialId === null ? "Add Story" : "Save Changes"}
            </button>
          </form>

          <div className="admin-list">
            {testimonials.length === 0 && (
              <p className="subtitle">No volunteer stories yet. Add the first one above!</p>
            )}
            {testimonials.map((t) => (
              <article className="admin-row" key={t.id}>
                <div className="admin-row-body">
                  <p className="admin-testimonial-quote">“{t.quote}”</p>
                  <span className="admin-row-meta">
                    <strong>{t.author}</strong> — {t.role}
                  </span>
                </div>
                <div className="actions admin-row-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => startEditTestimonial(t)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => removeTestimonial(t.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Tab 4: Impact & Mission (Site Settings) ─────────────────────────── */}
      {activeTab === "settings" && (
        <section className="admin-section" role="tabpanel">
          <div className="admin-section-header">
            <div>
              <h2>Impact Statistics & Mission Statement</h2>
              <p className="subtitle">
                Customize the persuasion banner and key community metrics displayed on the public homepage.
              </p>
            </div>
          </div>

          <form
            onSubmit={saveSiteSettings}
            style={{
              marginTop: "1.25rem",
              padding: "1.25rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              background: "var(--card-bg)",
            }}
          >
            <label style={{ display: "block", marginBottom: "1.5rem" }}>
              <strong>Homepage Mission Statement</strong>
              <span
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  color: "var(--subtitle)",
                  marginBottom: "0.5rem",
                }}
              >
                Displayed at the top of the homepage between the hero and opportunities grid.
              </span>
              <textarea
                rows={3}
                value={siteSettings.missionStatement}
                onChange={(e) =>
                  setSiteSettings((curr) => ({ ...curr, missionStatement: e.target.value }))
                }
                required
              />
            </label>

            <div>
              <strong style={{ display: "block", marginBottom: "0.35rem" }}>
                Impact Metrics Callouts (3 Highlight Numbers)
              </strong>
              <span
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  color: "var(--subtitle)",
                  marginBottom: "0.75rem",
                }}
              >
                Large editorial numbers displayed beneath the mission statement.
              </span>

              <div className="admin-stats-editor">
                {siteSettings.stats.map((stat, idx) => (
                  <div key={idx} className="admin-stat-card">
                    <h4>Metric {idx + 1}</h4>
                    <label>
                      Value / Number
                      <input
                        value={stat.value}
                        onChange={(e) => updateStat(idx, "value", e.target.value)}
                        placeholder="500+"
                        required
                      />
                    </label>
                    <label>
                      Label / Subtitle
                      <input
                        value={stat.label}
                        onChange={(e) => updateStat(idx, "label", e.target.value)}
                        placeholder="Volunteers Placed"
                        required
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingSettings}
              style={{ marginTop: "1rem" }}
            >
              {savingSettings ? "Saving Settings..." : "Save Mission & Impact Stats"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

export default AdminPage;
