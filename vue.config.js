module.exports = {
    publicPath: process.env.NODE_ENV === "development" ? "/" : "./",
    transpileDependencies: [
    'birpc'
    ]
};
  