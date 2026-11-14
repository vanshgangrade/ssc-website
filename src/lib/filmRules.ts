// Shared by the server and the browser, so this file must not import Prisma.
// Ratings are stored in half-stars: 1 = ½★ … 10 = ★★★★★.
export const RATING_MIN = 1;
export const RATING_MAX = 10;
export const REVIEW_MAX_CHARS = 2000;
export const BIO_MAX_CHARS = 280;
export const NAME_MAX_CHARS = 40;
export const COMMENT_MAX_CHARS = 500;
export const REPORT_MAX_CHARS = 300;
