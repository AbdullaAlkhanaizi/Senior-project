"use client";

import { useState } from "react";

export default function ReviewClient() {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [showForm, setShowForm] = useState(false);

  const dummyReviews = [
    { id: 1, title: "Excellent Service", name: "Alice", review: "Really loved it!", rating: 5, date: "2026-03-25" },
    { id: 2, title: "Good Advice", name: "Bob", review: "Helpful insights.", rating: 4, date: "2026-03-24" },
    { id: 3, title: "Quick Response", name: "Charlie", review: "Fast and professional.", rating: 5, date: "2026-03-23" },
    { id: 4, title: "Very Friendly", name: "Diana", review: "Nice and patient.", rating: 4, date: "2026-03-22" },
    { id: 5, title: "Highly Recommend", name: "Ethan", review: "Would use again.", rating: 5, date: "2026-03-21" },
    { id: 6, title: "Well Explained", name: "Fiona", review: "Clear and detailed.", rating: 5, date: "2026-03-20" },
  ];

  const allReviews = [...submittedReviews, ...dummyReviews];

  const handleSubmit = () => {
    if (!name || !review || !title) {
      alert("Please fill all required fields!");
      return;
    }

    const newReview = {
      id: Date.now(),
      title,
      name,
      review,
      rating,
      date: new Date().toISOString().split("T")[0],
    };

    setSubmittedReviews([newReview, ...submittedReviews]);
    setTitle("");
    setName("");
    setEmail("");
    setReview("");
    setRating(5);
    setShowForm(false);
  };

  const filteredReviews = allReviews
    .filter((r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.review.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.date.includes(searchTerm)
    )
    .sort((a, b) => {
      if (sortOption === "newest") return new Date(b.date) - new Date(a.date);
      if (sortOption === "oldest") return new Date(a.date) - new Date(b.date);
      if (sortOption === "highest") return b.rating - a.rating;
      if (sortOption === "lowest") return a.rating - b.rating;
      return 0;
    });

  const renderStars = (ratingValue) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= ratingValue ? "star-filled" : "star-empty"}>
          ⭐
        </span>
      );
    }
    return stars;
  };

  
  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: allReviews.filter((rev) => rev.rating === r).length,
  }));

  const maxCount = Math.max(...ratingCounts.map((r) => r.count));

  return (
    <div className="review-container">

      
      <div className="ratings-section">

        
        <div className="ratings-container">
          <h3 className="ratings-title">Ratings Overview</h3>

          <div className="ratings-bar-chart">
            {ratingCounts.map((r) => (
              <div key={r.rating} className="rating-row">
                <div className="rating-text">
                  <strong>{r.rating}.0</strong> ({r.count} {r.count === 1 ? "review" : "reviews"})
                </div>
                <div className="rating-bar-container">
                  <div
                    className="rating-bar-fill"
                    style={{
                      width: maxCount ? `${(r.count / maxCount) * 100}%` : "0%",
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        
        <div className="ratings-info-card">
          <h3>Our Commitment</h3>
          <p>
            We work hard to be the best at what we do. Our goal is to provide
            reliable, professional, and clear legal guidance tailored to your needs.
          </p>
          <p>
            Every review helps us improve and continue delivering high-quality
            service. We carefully listen to feedback and constantly refine our
            approach to ensure client satisfaction.
          </p>
        </div>

      </div>

      
      <div className="search-sort">
        <input
          type="text"
          placeholder="Search reviews..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>

        <button
          className="toggle-review-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Hide Review Form" : "Leave Your Review"}
        </button>
      </div>

      
      {showForm && (
        <div className="review-form">
          <input
            type="text"
            placeholder="Review Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <textarea
            placeholder="Write your review..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />

          <div className="rating-select">
            <label>Rating:</label>
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              <option value={5}>⭐⭐⭐⭐⭐</option>
              <option value={4}>⭐⭐⭐⭐</option>
              <option value={3}>⭐⭐⭐</option>
              <option value={2}>⭐⭐</option>
              <option value={1}>⭐</option>
            </select>
          </div>

          <button className="submit-review-btn" onClick={handleSubmit}>
            Submit Review
          </button>
        </div>
      )}

      
      <div className="reviews-grid">
        {filteredReviews.map((r) => (
          <div key={r.id} className="review-card">
            <div className="review-header">
              <p className="review-name">{r.name}</p>
              <p className="review-stars">{renderStars(r.rating)}</p>
            </div>
            <h3 className="review-title">{r.title}</h3>
            <p className="review-text">{r.review}</p>
            <p className="review-date">{r.date}</p>
          </div>
        ))}
      </div>

    </div>
  );
}