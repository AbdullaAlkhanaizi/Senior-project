"use client";

import { useMemo, useState } from "react";

import { INITIAL_REVIEWS, getReviewsForLawyer, getLawyerReviewSummary, normalizeLawyerReviewKey } from "../lib/reviews";

const LAWYER_OPTIONS = ["All lawyers", ...Array.from(new Set(INITIAL_REVIEWS.map((review) => review.lawyerName)))];

function renderStars(ratingValue) {
  const stars = [];
  const rounded = Math.round(Number(ratingValue) || 0);
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className={i <= rounded ? "star-filled" : "star-empty"}>
        ★
      </span>
    );
  }
  return stars;
}

export default function ReviewClient({ initialLawyer = "" }) {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [showForm, setShowForm] = useState(false);
  const matchedInitialLawyer = LAWYER_OPTIONS.find(
    (option) => normalizeLawyerReviewKey(option) === normalizeLawyerReviewKey(initialLawyer)
  );
  const [selectedLawyer, setSelectedLawyer] = useState(matchedInitialLawyer || "All lawyers");

  const allReviews = useMemo(() => [...submittedReviews, ...INITIAL_REVIEWS], [submittedReviews]);
  const visibleReviews = useMemo(
    () => (selectedLawyer === "All lawyers" ? allReviews : getReviewsForLawyer(allReviews, selectedLawyer)),
    [allReviews, selectedLawyer]
  );

  const filteredReviews = useMemo(() => {
    return visibleReviews
      .filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.review.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lawyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.date.includes(searchTerm)
      )
      .sort((a, b) => {
        if (sortOption === "newest") return new Date(b.date) - new Date(a.date);
        if (sortOption === "oldest") return new Date(a.date) - new Date(b.date);
        if (sortOption === "highest") return b.rating - a.rating;
        if (sortOption === "lowest") return a.rating - b.rating;
        return 0;
      });
  }, [visibleReviews, searchTerm, sortOption]);

  const selectedSummary = useMemo(
    () => getLawyerReviewSummary(allReviews, selectedLawyer === "All lawyers" ? "" : selectedLawyer),
    [allReviews, selectedLawyer]
  );

  const ratingCounts = useMemo(() => {
    return [5, 4, 3, 2, 1].map((score) => ({
      rating: score,
      count: visibleReviews.filter((item) => item.rating === score).length
    }));
  }, [visibleReviews]);

  const maxCount = Math.max(...ratingCounts.map((item) => item.count), 0);

  function handleToggleForm() {
    if (!showForm && selectedLawyer === "All lawyers" && LAWYER_OPTIONS[1]) {
      setSelectedLawyer(LAWYER_OPTIONS[1]);
    }
    setShowForm((current) => !current);
  }

  function handleSubmit() {
    if (!name || !review || !title || selectedLawyer === "All lawyers") {
      alert("Please choose a lawyer and fill all required fields.");
      return;
    }

    const newReview = {
      id: Date.now(),
      lawyerName: selectedLawyer,
      title,
      name,
      email,
      review,
      rating,
      date: new Date().toISOString().split("T")[0]
    };

    setSubmittedReviews([newReview, ...submittedReviews]);
    setTitle("");
    setName("");
    setEmail("");
    setReview("");
    setRating(5);
    setShowForm(false);
  }

  return (
    <div className="review-container">
      <div className="ratings-section">
        <div className="ratings-container">
          <h3 className="ratings-title">
            {selectedLawyer === "All lawyers" ? "Ratings Overview" : `${selectedLawyer} ratings`}
          </h3>
          <div className="review-summary-strip">
            <div>
              <strong>{selectedSummary.average.toFixed(1)}</strong>
              <span>Average rating</span>
            </div>
            <div className="review-summary-stars">{renderStars(selectedSummary.average)}</div>
            <div>
              <strong>{selectedSummary.count}</strong>
              <span>{selectedSummary.count === 1 ? "Review" : "Reviews"}</span>
            </div>
          </div>

          <div className="ratings-bar-chart">
            {ratingCounts.map((item) => (
              <div key={item.rating} className="rating-row">
                <div className="rating-text">
                  <strong>{item.rating}.0</strong> ({item.count} {item.count === 1 ? "review" : "reviews"})
                </div>
                <div className="rating-bar-container">
                  <div
                    className="rating-bar-fill"
                    style={{
                      width: maxCount ? `${(item.count / maxCount) * 100}%` : "0%"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ratings-info-card">
          <h3>{selectedLawyer === "All lawyers" ? "Review directory" : `About ${selectedLawyer}`}</h3>
          <p>
            Reviews are now organized by lawyer, so clients can compare experience, responsiveness, and clarity before opening a case.
          </p>
          <p>
            Use the lawyer filter to inspect one profile in depth, then sort by newest or rating to scan the most relevant feedback quickly.
          </p>
        </div>
      </div>

      <div className="search-sort">
        <select value={selectedLawyer} onChange={(event) => setSelectedLawyer(event.target.value)}>
          {LAWYER_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search reviews..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select value={sortOption} onChange={(event) => setSortOption(event.target.value)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>

        <button className="toggle-review-btn" onClick={handleToggleForm}>
          {showForm ? "Hide Review Form" : "Leave Your Review"}
        </button>
      </div>

      {showForm ? (
        <div className="review-form">
          <select value={selectedLawyer} onChange={(event) => setSelectedLawyer(event.target.value)}>
            {LAWYER_OPTIONS.filter((option) => option !== "All lawyers").map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Review Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            type="email"
            placeholder="Your Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <textarea
            placeholder="Write your review..."
            value={review}
            onChange={(event) => setReview(event.target.value)}
          />

          <div className="rating-select">
            <label>Rating:</label>
            <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
              <option value={5}>★★★★★</option>
              <option value={4}>★★★★</option>
              <option value={3}>★★★</option>
              <option value={2}>★★</option>
              <option value={1}>★</option>
            </select>
          </div>

          <button className="submit-review-btn" onClick={handleSubmit}>
            Submit Review
          </button>
        </div>
      ) : null}

      <div className="reviews-grid">
        {filteredReviews.map((item) => (
          <div key={item.id} className="review-card">
            <div className="review-header">
              <div>
                <p className="review-name">{item.name}</p>
                <small className="review-lawyer">{item.lawyerName}</small>
              </div>
              <p className="review-stars">{renderStars(item.rating)}</p>
            </div>
            <h3 className="review-title">{item.title}</h3>
            <p className="review-text">{item.review}</p>
            <p className="review-date">{item.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
