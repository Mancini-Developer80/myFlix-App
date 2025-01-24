const express = require("express");
const morgan = require("morgan");
const app = express();

const port = 8080;

const topItalianMovies = require("./data/movies.json");

app.use(morgan("dev"));

app.use(express.static("public"));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});
// define the home page route
app.get("/", (req, res) => {
  res.send("Hello World!");
});
//define the documentation route
app.get("/documentation", (req, res) => {
  res.sendFile(__dirname + "/public/documentation.html");
});

// define the movies endpoint
app.get("/movies", (req, res) => {
  res.json(topItalianMovies);
});
//start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
