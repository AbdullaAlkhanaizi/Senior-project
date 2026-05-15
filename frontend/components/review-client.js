"use client";

import { useMemo, useState, useEffect } from "react";

import { getReviewsForLawyer, getLawyerReviewSummary, normalizeLawyerReviewKey } from "../lib/reviews";
import { getDashboard, getReviews, createReview } from "../lib/api";

function ChevronIcon({ open }) {
  return (
    <svg
      className={`review-chevron ${open ? "open" : ""}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function renderStars(ratingValue, { allowPartial = false } = {}) {
  const stars = [];
  const numericRating = Number(ratingValue) || 0;
  const roundedRating = allowPartial ? numericRating : Math.round(numericRating);

  for (let i = 1; i <= 5; i++) {
    const fillPercent = Math.max(0, Math.min(1, roundedRating - (i - 1))) * 100;
    stars.push(
      <span key={i} className="review-star" aria-hidden="true">
        <span className="review-star-base">{"\u2605"}</span>
        <span className="review-star-fill" style={{ width: `${fillPercent}%` }}>
          {"\u2605"}
        </span>
      </span>
    );
  }

  return stars;
}

export default function ReviewClient({ initialLawyer = "" }) {
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);
  const [reviews, setReviews] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [showForm, setShowForm] = useState(true);
  
  const [selectedLawyerId, setSelectedLawyerId] = useState("");
  const [filterLawyerId, setFilterLawyerId] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const dashRes = await getDashboard();
        const loadedLawyers = dashRes.lawyers || [];
        setLawyers(loadedLawyers);

        if (loadedLawyers.length > 0) {
          const matchedInitial = loadedLawyers.find(
            (l) => normalizeLawyerReviewKey(l.name) === normalizeLawyerReviewKey(initialLawyer)
          );
          const defaultLId = matchedInitial ? matchedInitial.id : loadedLawyers[0].id;
          setSelectedLawyerId(defaultLId);
          setFilterLawyerId(defaultLId);
        }

        const revRes = await getReviews();
        setReviews(revRes || []);
      } catch (err) {
        console.error("Failed to load data for reviews", err);
      }
    }
    loadData();
  }, [initialLawyer]);

  const selectedLawyerObj = useMemo(() => {
    return lawyers.find((l) => String(l.id) === String(filterLawyerId));
  }, [lawyers, filterLawyerId]);

  const selectedLawyerName = selectedLawyerObj ? selectedLawyerObj.name : "";

  const visibleReviews = useMemo(
    () => getReviewsForLawyer(reviews, selectedLawyerName),
    [reviews, selectedLawyerName]
  );

  const filteredReviews = useMemo(() => {
    return visibleReviews
      .filter((item) => {
        const normalizedSearch = searchTerm.toLowerCase();
        return (
          (item.name || "").toLowerCase().includes(normalizedSearch) ||
          (item.title || "").toLowerCase().includes(normalizedSearch) ||
          (item.review || "").toLowerCase().includes(normalizedSearch) ||
          (item.lawyerName || "").toLowerCase().includes(normalizedSearch) ||
          (item.date || "").includes(searchTerm)
        );
      })
      .sort((a, b) => {
        if (sortOption === "newest") return new Date(b.date) - new Date(a.date);
        if (sortOption === "oldest") return new Date(a.date) - new Date(b.date);
        if (sortOption === "highest") return b.rating - a.rating;
        if (sortOption === "lowest") return a.rating - b.rating;
        return 0;
      });
  }, [visibleReviews, searchTerm, sortOption]);

  const selectedSummary = useMemo(
    () => getLawyerReviewSummary(reviews, selectedLawyerName),
    [reviews, selectedLawyerName]
  );

  const ratingCounts = useMemo(() => {
    return [5, 4, 3, 2, 1].map((score) => ({
      rating: score,
      count: visibleReviews.filter((item) => item.rating === score).length
    }));
  }, [visibleReviews]);

  const maxCount = Math.max(...ratingCounts.map((item) => item.count), 0);

  function handleToggleForm() {
    setShowForm((current) => !current);
  }

  async function handleSubmit() {
    if (!review || !title || !selectedLawyerId) {
      alert("Please fill all required fields and select a lawyer.");
      return;
    }

    try {
      const newReview = await createReview({
        lawyerId: Number(selectedLawyerId),
        title,
        review,
        rating
      });

      setReviews([newReview, ...reviews]);
      setTitle("");
      setReview("");
      setRating(5);
      setShowForm(false);
    } catch (error) {
      alert(error.message || "Failed to submit review.");
    }
  }

  return (
    <section className="review-showcase">
      <div className="review-showcase-header">
        <button type="button" className="toggle-review-btn" onClick={handleToggleForm}>
          {showForm ? "Hide Review Form" : "Show Review Form"}
        </button>
      </div>

      <div className="review-layout">
        <div className="review-left-column">
          <div className="ratings-container">
            <div className="ratings-card-content">
              <div className="ratings-summary">
                <span className="summary-label">OVERALL RATING</span>
                <div className="summary-score-row">
                  <strong>{selectedSummary.average.toFixed(1)}</strong>
                  <div className="review-summary-stars" aria-label={`${selectedSummary.average.toFixed(1)} out of 5 stars`}>
                    {renderStars(selectedSummary.average, { allowPartial: true })}
                  </div>
                </div>
                <p>
                  Based on {selectedSummary.count} {selectedSummary.count === 1 ? "Rating" : "Ratings"}
                </p>
              </div>

              <div className="ratings-bar-chart">
                {ratingCounts.map((item) => (
                  <div key={item.rating} className="rating-row">
                    <span className="rating-row-label">{item.rating.toFixed(1)}</span>
                    <div className="rating-bar-container">
                      <div
                        className="rating-bar-fill"
                        style={{
                          width: maxCount ? `${(item.count / maxCount) * 100}%` : "0%"
                        }}
                      />
                    </div>
                    <span className="rating-row-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="review-form-card">
            <button type="button" className="review-form-header" onClick={handleToggleForm} aria-expanded={showForm}>
              <span>Submit a Review</span>
              <ChevronIcon open={showForm} />
            </button>

            {showForm ? (
              <div className="review-form">
                <div className="review-field">
                  <label htmlFor="review-lawyer">Lawyer</label>
                  <select
                    id="review-lawyer"
                    value={selectedLawyerId}
                    onChange={(event) => setSelectedLawyerId(event.target.value)}
                  >
                    {lawyers.map((lawyer) => (
                      <option key={lawyer.id} value={lawyer.id}>
                        {lawyer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="review-field">
                  <label htmlFor="review-title">Review Title</label>
                  <input
                    id="review-title"
                    type="text"
                    placeholder="e.g., Clear guidance on a traffic fine"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>

                <div className="review-field">
                  <label htmlFor="review-comment">Review Text / Comment</label>
                  <textarea
                    id="review-comment"
                    placeholder="Share your experience"
                    value={review}
                    onChange={(event) => setReview(event.target.value)}
                  />
                </div>

                <div className="rating-select">
                  <span>Rating:</span>
                  <div className="rating-picker" role="radiogroup" aria-label="Select a rating">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        className={`rating-star-button ${score <= rating ? "active" : ""}`}
                        onClick={() => setRating(score)}
                        aria-label={`${score} star${score === 1 ? "" : "s"}`}
                        aria-pressed={score === rating}
                      >
                        {"\u2605"}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="submit-review-btn" onClick={handleSubmit}>
                  Submit Review
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="review-right-column">
          <div className="reviews-heading-block">
            <h2>Reviews ({filteredReviews.length})</h2>
          </div>

          <div className="search-sort">
            <div className="review-filter-field">
              <label htmlFor="existing-lawyer-filter">Attorney</label>
              <select 
                id="existing-lawyer-filter" 
                value={filterLawyerId} 
                onChange={(event) => setFilterLawyerId(event.target.value)}
              >
                {lawyers.map((lawyer) => (
                  <option key={lawyer.id} value={lawyer.id}>
                    {lawyer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="review-filter-field review-search-field">
              <label htmlFor="existing-review-search" className="review-sr-only">
                Search reviews
              </label>
              <input
                id="existing-review-search"
                type="text"
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="review-filter-field">
              <label htmlFor="existing-review-sort">Sort</label>
              <select id="existing-review-sort" value={sortOption} onChange={(event) => setSortOption(event.target.value)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
          </div>

          <div className="reviews-grid">
            {filteredReviews.map((item) => (
              <article key={item.id} className="review-card">
                <div className="review-card-top">
                  <h3 className="review-title">{item.title}</h3>
                </div>
                <div className="review-stars review-card-stars" aria-label={`${item.rating} out of 5 stars`}>
                  {renderStars(item.rating)}
                </div>
                <p className="review-meta">
                  By: {item.name} / {item.date && new Date(item.date).toLocaleDateString() !== "Invalid Date" ? new Date(item.date).toLocaleDateString() : item.date}
                </p>
                <p className="review-text">{item.review}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
