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
