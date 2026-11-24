/** Orbit commit rules: Conventional Commits, English, and no AI attribution trailers. */
const FORBIDDEN_TRAILERS = [/^\s*co-authored-by\s*:/im, /generated with .*(claude|chatgpt|copilot|gemini)/im];

const noAttributionTrailer = (parsed) => {
  const text = parsed.raw ?? '';
  const hit = FORBIDDEN_TRAILERS.find((pattern) => pattern.test(text));
  return [!hit, 'commit message must not contain Co-authored-by or an AI attribution trailer'];
};

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [{ rules: { 'no-attribution-trailer': noAttributionTrailer } }],
  rules: {
    'no-attribution-trailer': [2, 'always'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 100],
  },
};
