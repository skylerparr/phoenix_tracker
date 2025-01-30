module.exports = {
  plugins: {
    "postcss-preset-env": {
      stage: 3,
      features: {
        "nesting-rules": true,
      },
      browsers: ["> 1%", "last 2 versions", "Firefox ESR"],
    },
  },
};
