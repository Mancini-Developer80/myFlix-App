const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const passport = require("passport");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const cors = require("cors");

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const { Movie, Genre, Director } = require("./models/movies");
const User = require("./models/users");
const login = require("./auth");

const app = express();
const port = process.env.PORT || 8080;

// Connect to MongoDB Atlas using environment variables
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const connectionURI = process.env.CONNECTION_URI;

const dbURI = connectionURI.replace("<db_password>", dbPassword);

mongoose.connect(dbURI);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to the database");
});

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());

app.use(passport.initialize());

app.post("/login", login);

app.use((req, res, next) => {
  const logEntry = `URL: ${req.url}\nTimestamp: ${new Date()}\n\n`;
  fs.appendFile(path.join(__dirname, "log.txt"), logEntry, (err) => {
    if (err) {
      console.error("Failed to write to log file:", err);
    }
  });
  next();
});

app.get("/", (req, res) => {
  res.send("Welcome to myFlix!");
});

// Return a list of ALL users (admin only)
app.get(
  "/users",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).send("Access denied. Admins only.");
    }

    try {
      const users = await User.find();
      res.status(200).json(users);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// GET a user
app.get(
  "/users/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id } = req.params;
    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).send("User not found");
      }
      res.status(200).json(user);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// Allow new users to register
app.post("/users", async (req, res) => {
  let { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).send("All fields are required");
  } else {
    try {
      // Trim whitespace from username and email
      username = username.trim();
      email = email.trim();

      const hashedPassword = bcrypt.hashSync(password, 10);
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        favoriteMovies: [],
      });
      const savedUser = await newUser.save();
      res.status(201).json(savedUser);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
});
// Allow users to update their user info
app.put(
  "/users/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id } = req.params;
    const { username, email, password } = req.body;
    try {
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { username, email, password },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).send("User not found");
      }
      res.status(200).json(updatedUser);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// Allow users to add a movie to their list of favorites
app.post(
  "/users/:id/movies/:movieTitle",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id, movieTitle } = req.params;
    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).send("User not found");
      }
      const movie = await Movie.findOne({ Title: movieTitle });
      if (!movie) {
        return res.status(404).send("Movie not found");
      }
      // Check if the movie is already in the user's list of favorite movies
      if (user.favoriteMovies.includes(movie._id)) {
        return res.status(400).send("Movie already in favorite list");
      }
      user.favoriteMovies.push(movie._id);
      const updatedUser = await user.save();
      res.status(201).json(updatedUser);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// Allow users to remove a movie from their list of favorites
app.delete(
  "/users/:id/movies/:movieTitle",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id, movieTitle } = req.params;
    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).send("User not found");
      }
      const movie = await Movie.findOne({ Title: movieTitle });
      if (!movie) {
        return res.status(404).send("Movie not found");
      }
      user.favoriteMovies = user.favoriteMovies.filter(
        (movieId) => movieId.toString() !== movie._id.toString()
      );
      const updatedUser = await user.save();
      res.status(200).json(updatedUser);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// Allow existing users to deregister
app.delete(
  "/users/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id } = req.params;
    try {
      const deletedUser = await User.findByIdAndDelete(id);
      if (!deletedUser) {
        return res.status(404).send("User not found");
      }
      res.status(200).send("User deregistered");
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// Return a user's favorite movies
app.get(
  "/users/:id/favoriteMovies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id } = req.params;
    try {
      const user = await User.findById(id).populate("favoriteMovies");
      if (!user) {
        return res.status(404).send("User not found");
      }
      res.status(200).json(user.favoriteMovies);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// Movie routes

// Return a list of ALL movies to the user
app.get("/movies", async (req, res) => {
  try {
    const movies = await Movie.find();
    res.status(200).json(movies);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Return data about a single movie by title
app.get(
  "/movies/:title",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { title } = req.params;
    try {
      const movie = await Movie.findOne({ Title: title });
      if (!movie) {
        return res.status(404).send("Movie not found");
      }
      res.status(200).json(movie);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// Return data about a genre by name
app.get(
  "/genres/:name",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { name } = req.params;
    try {
      const genre = await Genre.findOne({ Name: name });
      if (!genre) {
        return res.status(404).send("Genre not found");
      }
      res.status(200).json(genre);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// Return data about a director by name
app.get(
  "/directors/:name",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { name } = req.params;
    try {
      const director = await Director.findOne({ Name: name });
      if (!director) {
        return res.status(404).send("Director not found");
      }
      res.status(200).json(director);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// Allow new movies to be added
app.post(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { Title, Description, Genre, Director, ImageURL, Featured } =
      req.body;
    if (!Title || !Description || !Genre || !Director || !ImageURL) {
      return res.status(400).send("All fields are required");
    } else {
      try {
        const newMovie = new Movie({
          Title,
          Description,
          Genre,
          Director,
          ImageURL,
          Featured: Featured || false,
        });
        const savedMovie = await newMovie.save();
        res.status(201).json(savedMovie);
      } catch (err) {
        res.status(500).send(err.message);
      }
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
