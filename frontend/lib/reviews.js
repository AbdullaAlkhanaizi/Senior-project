export const INITIAL_REVIEWS = [
  {
    id: 1,
    lawyerName: "Noor Al-Sayed",
    title: "Clear guidance on a traffic fine",
    name: "Alice",
    review: "Explained the process clearly and helped me respond before the deadline.",
    rating: 5,
    date: "2026-03-25"
  },
  {
    id: 2,
    lawyerName: "Noor Al-Sayed",
    title: "Professional and fast",
    name: "Bob",
    review: "Very responsive and practical for a municipal violations issue.",
    rating: 4,
    date: "2026-03-24"
  },
  {
    id: 3,
    lawyerName: "Khalid Rahman",
    title: "Strong litigation advice",
    name: "Charlie",
    review: "Helped me understand the next steps in a contract dispute without overcomplicating it.",
    rating: 5,
    date: "2026-03-23"
  },
  {
    id: 4,
    lawyerName: "Khalid Rahman",
    title: "Direct and useful",
    name: "Diana",
    review: "Clear feedback on my civil case and realistic expectations from the start.",
    rating: 4,
    date: "2026-03-22"
  },
  {
    id: 5,
    lawyerName: "Sara Haddad",
    title: "Excellent employment law support",
    name: "Ethan",
    review: "She reviewed my employment documents carefully and highlighted the real risks.",
    rating: 5,
    date: "2026-03-21"
  },
  {
    id: 6,
    lawyerName: "Sara Haddad",
    title: "Very clear commercial review",
    name: "Fiona",
    review: "Good eye for details in a business agreement and explained revisions well.",
    rating: 5,
    date: "2026-03-20"
  }
];

export function normalizeLawyerReviewKey(value = "") {
  return String(value).trim().toLowerCase();
}

export function getReviewsForLawyer(reviews, lawyerName) {
  const key = normalizeLawyerReviewKey(lawyerName);
  if (!key) {
    return reviews;
  }

  return reviews.filter((review) => normalizeLawyerReviewKey(review.lawyerName) === key);
}

export function getLawyerReviewSummary(reviews, lawyerName) {
  const lawyerReviews = getReviewsForLawyer(reviews, lawyerName);
  const count = lawyerReviews.length;
  if (!count) {
    return {
      count: 0,
      average: 0
    };
  }

  const total = lawyerReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);

  return {
    count,
    average: Math.round((total / count) * 10) / 10
  };
}
