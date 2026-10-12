import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  fetchApplications,
  fetchOpportunities,
  fetchSiteSettings,
  fetchTestimonials,
  type ApplicationRecord,
  type SiteSettingsRecord,
  type TestimonialRecord,
} from "../api/api";
import { useAuth } from "../context/AuthContext";
import type { VolunteerOpportunity } from "../types/VolunteerOpportunity";
import {
  getOpportunityImageUrl,
  useFallbackImage,
  CATEGORY_FALLBACKS,
  DEFAULT_FALLBACK,
} from "../utils/opportunityImage";

const FILTERS = ["All", "Education", "Environment", "Outreach"];

const DEFAULT_STATS = [
  { value: "500+", label: "Volunteers Placed" },
  { value: "40+", label: "Partner Organizations" },
  { value: "12,000+", label: "Hours Contributed" },
];

const DEFAULT_TESTIMONIALS: TestimonialRecord[] = [
  {
    id: 1,
    quote: "Tutoring with Signify showed me how much of a difference just two hours a week can make in a child's reading confidence.",
    author: "Maria",
    role: "Community Tutor volunteer",
  },
  {
    id: 2,
    quote: "Planting mangroves along the coast gave our group a tangible sense of environmental stewardship and camaraderie.",
    author: "Carlos",
    role: "Coastal Cleanup & Reforestation volunteer",
  },
  {
    id: 3,
    quote: "Preparing and distributing warm meals after the storm was one of the most heartwarming experiences of my life.",
    author: "Aira",
    role: "Food Drive & Relief volunteer",
  },
];

function HomePage() {
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [userApplications, setUserApplications] = useState<ApplicationRecord[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettingsRecord>({
    missionStatement:
      "Signify connects everyday Filipinos with local volunteer opportunities that need them most. No experience required, just a few hours and a willingness to help.",
    stats: DEFAULT_STATS,
  });
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>(DEFAULT_TESTIMONIALS);

  const { account } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetchOpportunities(),
      account ? fetchApplications().catch(() => []) : Promise.resolve([]),
      fetchTestimonials().catch(() => null),
      fetchSiteSettings().catch(() => null),
    ])
      .then(([opps, apps, testims, settings]) => {
        setOpportunities(opps);
        if (apps && Array.isArray(apps)) {
          setUserApplications(apps);
        }
        if (testims && Array.isArray(testims) && testims.length > 0) {
          setTestimonials(testims);
        }
        if (settings && settings.stats && settings.stats.length > 0) {
          setSiteSettings(settings);
        }
      })
      .catch(() => setLoadError("Could not load opportunities. Is the API server running?"))
      .finally(() => setLoading(false));
  }, [account]);

  // Featured urgent opportunities (up to 3 priority cards)
  const urgentOpportunities = opportunities
    .filter((o) => o.isPriority && (activeFilter === "All" || o.type === activeFilter))
    .slice(0, 3);
  const effectiveUrgent =
    activeFilter === "All"
      ? (urgentOpportunities.length > 0 ? urgentOpportunities : opportunities.slice(0, 1))
      : urgentOpportunities;

  const filtered = opportunities.filter((o) => {
    const matchesFilter = activeFilter === "All" || o.type === activeFilter;
    const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="page page-wide home-page">
      {/* Hero Section */}
      <section className="home-hero">
        <p className="eyebrow">Volunteer together</p>
        <h1 className="page-title">Make an Impact Today</h1>
        <p className="page-subtitle">
          Join a community of everyday Filipinos stepping up to support grassroots education, coastal protection, and relief efforts across the country.
        </p>
      </section>

      {/* About & Impact Section */}
      <section className="home-impact" aria-label="About our impact">
        <p className="home-impact-mission">
          {siteSettings.missionStatement}
        </p>
        <div className="home-impact-stats">
          {siteSettings.stats.map((stat, idx) => (
            <div key={`${stat.label}-${idx}`} className="stat-item">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {loading && <p className="loading-message" role="status" aria-live="polite">Loading opportunities...</p>}
      {loadError && <p className="error" role="alert">{loadError}</p>}

      {!loading && !loadError && (
        <>
          {/* Featured Urgent Opportunities */}
          {effectiveUrgent.length > 0 && (
            <section className="urgent-section" aria-label="Most urgent volunteer needs">
              <div className="section-heading-group">
                <span className="eyebrow">Critical Needs</span>
                <h2>Most Urgent Opportunities</h2>
                <p>These initiatives have immediate volunteer shortages and scheduled deployments this week.</p>
              </div>

              <div className="urgent-grid">
                {effectiveUrgent.map((o) => {
                  const hasApplied = userApplications.some((app) => app.volunteerId === o.id);
                  return (
                    <article
                      key={`urgent-${o.id}`}
                      className={`opportunity-card featured category-${o.type.toLowerCase()}`}
                    >
                      <div className="opportunity-card-media">
                        <img
                          src={getOpportunityImageUrl(o)}
                          data-fallback={CATEGORY_FALLBACKS[o.type] ?? DEFAULT_FALLBACK}
                          onError={useFallbackImage}
                          alt={`${o.name} volunteers in action`}
                          className="opportunity-card-image"
                        />
                      </div>
                      <div className="opportunity-card-header">
                        <span className="badge">{o.type.toUpperCase()}</span>
                        <span className="priority-badge">PRIORITY</span>
                        <span className="spots-pill">{o.spotsLeft} spots left</span>
                      </div>
                      <h3>{o.name}</h3>
                      <p>{o.description}</p>
                      <p className="featured-note">High priority • Immediate volunteer team assignment</p>
                      {hasApplied && (
                        <p className="application-notice">
                          <span>You've already applied to this opportunity.</span>{" "}
                          <Link to="/my-applications">View My Applications</Link>
                        </p>
                      )}
                      <button
                        type="button"
                        className={`btn btn-block ${o.spotsLeft === 0 ? "btn-full" : "btn-primary"}`}
                        onClick={() => navigate(`/opportunities/${o.id}`)}
                      >
                        {o.spotsLeft === 0 ? "Full" : hasApplied ? "Already applied" : "Apply Now"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Browse All Opportunities */}
          <section className="browse-section" aria-label="Browse all opportunities">
            <div className="section-heading-group">
              <h2>Browse All Opportunities</h2>
              <p>Filter by focus area or search by community initiative name.</p>
            </div>

            <div className="home-controls" aria-label="Opportunity filters">
              <input
                className="search-input"
                placeholder="Search opportunities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="filter-row">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`chip ${activeFilter === f ? "chip-active" : ""}`}
                    onClick={() => setActiveFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-grid">
              {filtered.map((o, index) => {
                const hasApplied = userApplications.some((app) => app.volunteerId === o.id);
                // Size variation: every third card renders wider (2-column span) when there are enough cards
                const isWide = index % 3 === 0 && filtered.length > 2;

                return (
                  <article
                    className={`opportunity-card ${isWide ? "card-wide" : ""} category-${o.type.toLowerCase()}`}
                    key={o.id}
                  >
                    <div className="opportunity-card-media">
                      <img
                        src={getOpportunityImageUrl(o)}
                        data-fallback={CATEGORY_FALLBACKS[o.type] ?? DEFAULT_FALLBACK}
                        onError={useFallbackImage}
                        alt={`${o.name} volunteers in action`}
                        className="opportunity-card-image"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="opportunity-card-header">
                      <span className="badge">{o.type.toUpperCase()}</span>
                      {Boolean(o.isPriority) && <span className="priority-badge">PRIORITY</span>}
                      <span className="spots-pill">{o.spotsLeft} spots left</span>
                    </div>
                    <h3>{o.name}</h3>
                    <p>{o.description}</p>

                    {/* Hover detail */}
                    <div className="card-hover-reveal">
                      <span className="card-hover-text">
                        On-site orientation & certificate of community service provided
                      </span>
                    </div>

                    {hasApplied && (
                      <p className="application-notice">
                        <span>You've already applied to this opportunity.</span>{" "}
                        <Link to="/my-applications">View My Applications</Link>
                      </p>
                    )}

                    <button
                      type="button"
                      className={`btn btn-block ${o.spotsLeft === 0 ? "btn-full" : "btn-primary"}`}
                      onClick={() => navigate(`/opportunities/${o.id}`)}
                    >
                      {o.spotsLeft === 0 ? "Full" : hasApplied ? "Already applied" : "Apply Now"}
                    </button>
                  </article>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="empty-state">
                <h2>No opportunities match your search.</h2>
                <p className="subtitle">Try clearing your search term or selecting a different category filter.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearch("");
                    setActiveFilter("All");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </section>

          {/* Testimonials & Community Stories */}
          <section className="home-testimonials" aria-label="Volunteer stories">
            <div className="section-heading-group">
              <span className="eyebrow">Voices of Bayanihan</span>
              <h2>Stories from Our Volunteers</h2>
              <p>Hear from everyday volunteers about what community service looks like on the ground.</p>
            </div>

            <div className="testimonials-grid">
              {testimonials.map((t) => (
                <article key={t.id || t.author} className="testimonial-card">
                  <span className="testimonial-quote-mark" aria-hidden="true">“</span>
                  <p className="testimonial-quote">{t.quote}</p>
                  <div className="testimonial-author">{t.author}</div>
                  <div className="testimonial-role">{t.role}</div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default HomePage;