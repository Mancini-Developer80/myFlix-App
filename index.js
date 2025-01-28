const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const app = express();
const uuid = require("uuid");

const port = 8080;

const movies = require("./data/movies.json");
let users = require("./data/users.json");

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use((req, res, next) => {
  const logEntry = `URL: ${req.url}\nTimestamp: ${new Date()}\n\n`;
  fs.appendFile(path.join(__dirname, "log.txt"), logEntry, (err) => {
    if (err) {
      console.error("Failed to write to log file:", err);
    }
  });
  next();
});

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

// create a new user
app.post("/users", (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) {
    return res.status(400).send("username and email are required");
  } else {
    const newUser = {
      username,
      email,
      id: uuid.v4(),
    };
    users.push(newUser);
    res.status(201).json(newUser);
  }
});

// UPDATE a user
app.put("/users/:id", (req, res) => {
  const { id } = req.params;
  const updateUser = req.body;
  const userIndex = users.findIndex((user) => user.id == id);
  if (userIndex === -1) {
    return res.status(404).send("User not found");
  } else {
    users[userIndex] = { ...users[userIndex], ...updateUser };
    res.status(200).json(users[userIndex]);
  }
});

// GET a user
app.get("/users/:id", (req, res) => {
  const { id } = req.params;
  const user = users.find((user) => user.id == id);
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404).send("User not found");
  }
});

// define the movies endpoint
app.get("/movies", (req, res) => {
  res.status(200).json(movies);
});
// define the genre endpoint
app.get("/movies/:title", (req, res) => {
  const { title } = req.params;
  const movie = movies.find((movie) => movie.Title === title);

  if (movie) {
    res.status(200).json(movie);
  } else {
    res.status(404).send("Movie not found");
  }
});
// get the genre of a movie
app.get("/movies/genre/:genreName", (req, res) => {
  const { genreName } = req.params;
  const genre = movies.find((movie) => movie.Genre.Type === genreName).Genre;

  if (genre) {
    res.status(200).json(genre);
  } else {
    res.status(404).send("genre not found");
  }
});
// getting the director of a movie
app.get("/movies/directors/:directorName", (req, res) => {
  const { directorName } = req.params;
  const director = movies.find(
    (movie) => movie.Director.Name === directorName
  ).Director;

  if (director) {
    res.status(200).json(director);
  } else {
    res.status(404).send("Director not found");
  }
});

// a user creating a new movie
app.post("/users/:id/:movieTitle", (req, res) => {
  const { id, movieTitle } = req.params;
  const user = users.find((user) => user.id == id);
  const movie = movies.find((movie) => movie.Title === movieTitle);
  if (!user) {
    return res.status(404).send("User not found");
  } else if (!movie) {
    return res.status(404).send("Movie not found");
  } else {
    user.favoriteMovies.push(movie);
    res.status(201).json(user);
  }
});

// a user deleting a movie
app.delete("/users/:id/:movieTitle", (req, res) => {
  const { id, movieTitle } = req.params;
  const user = users.find((user) => user.id == id);
  if (user) {
    user.favoriteMovies = user.favoriteMovies.filter(
      (movie) => movie.Title !== movieTitle
    );
    res.status(200).send(`Movie ${movieTitle} has been deleted`);
  } else {
    return res.status(404).send("User not found");
  }
});

// delete a user
app.delete("/users/:id", (req, res) => {
  const { id } = req.params;
  let user = users.find((user) => user.id == id);
  if (user) {
    users = users.filter((user) => user.id != id);
    res.status(200).send(`User ${id} has been deleted`);
  } else {
    res.status(404).send("User not found");
  }
});

//start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
