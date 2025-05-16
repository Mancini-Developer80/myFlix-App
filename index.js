const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const passport = require("passport");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const cors = require("cors");
const { uploadImage } = require("./imgur");

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

/**
 * @name GetAllUsers
 * @route GET /users
 * @description Retrieve a list of all users. Only accessible by admins.
 * @access Private (Admin only)
 * @authentication JWT
 */
app.get(
  "/users",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    try {
      const users = await User.find();
      res.status(200).json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @name GetUserById
 * @route GET /users/:id
 * @description Retrieve a user's information by their ID.
 * @access Private
 * @authentication JWT
 */
app.get(
  "/users/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id } = req.params;
    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @name RegisterUser
 * @route POST /users
 * @description Register a new user.
 * @access Public
 */
app.post("/users", async (req, res) => {
  let { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  } else {
    try {
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
      // Handle duplicate key error
      if (err.code === 11000) {
        return res
          .status(409)
          .json({ error: "Username or email already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  }
});

/**
 * @name UpdateUser
 * @route PUT /users/:id
 * @description Update a user's information by their ID.
 * @access Private
 * @authentication JWT
 */
app.put(
  "/users/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id } = req.params;
    let { username, email, password } = req.body;
    try {
      // Only update fields if provided
      const updateFields = {};
      if (username) updateFields.username = username.trim();
      if (email) updateFields.email = email.trim();
      if (password) updateFields.password = bcrypt.hashSync(password, 10);

      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json(updatedUser);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @name AddFavoriteMovie
 * @route POST /users/:id/movies/:movieTitle
 * @description Add a movie to a user's list of favorite movies.
 * @access Private
 * @authentication JWT
 */
app.post(
  "/users/:id/movies/:movieTitle",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id, movieTitle } = req.params;
    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const movie = await Movie.findOne({ Title: movieTitle });
      if (!movie) {
        return res.status(404).json({ error: "Movie not found" });
      }
      // Check if the movie is already in the user's list of favorite movies
      if (user.favoriteMovies.includes(movie._id)) {
        return res
          .status(400)
          .json({ error: "Movie already in favorite list" });
      }
      user.favoriteMovies.push(movie._id);
      const updatedUser = await user.save();
      res.status(201).json(updatedUser);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @name DeregisterUser
 * @route DELETE /users/:id
 * @description Deregister a user by their ID.
 * @access Private
 * @authentication JWT
 */
app.delete(
  "/users/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id } = req.params;
    try {
      const deletedUser = await User.findByIdAndDelete(id);
      if (!deletedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json({ message: "User deregistered" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @name GetUserFavoriteMovies
 * @route GET /users/:id/favoriteMovies
 * @description Retrieve a user's list of favorite movies by their ID.
 * @access Private
 * @authentication JWT
 */
app.get(
  "/users/:id/favoriteMovies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id } = req.params;
    try {
      const user = await User.findById(id).populate("favoriteMovies");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json(user.favoriteMovies);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @name GetAllMovies
 * @route GET /movies
 * @description Retrieve a list of all movies.
 * @access Private
 * @authentication JWT
 */
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const movies = await Movie.find();
      res.status(200).json(movies);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @name DeleteMovie
 * @route DELETE /movies/:id
 * @description Delete a movie by its ID.
 * @access Private (Admin only, or adjust as needed)
 * @authentication JWT
 */
app.delete(
  "/movies/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id } = req.params;
    try {
      const deletedMovie = await Movie.findByIdAndDelete(id);
      if (!deletedMovie) {
        return res.status(404).json({ error: "Movie not found" });
      }
      res.status(200).json({ message: "Movie deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @name GetMovieByTitle
 * @route GET /movies/:title
 * @description Retrieve data about a movie by its title.
 * @access Private
 * @authentication JWT
 */
app.get(
  "/movies/:title",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { title } = req.params;
    try {
      const movie = await Movie.findOne({ Title: title });
      if (!movie) {
        return res.status(404).json({ error: "Movie not found" });
      }
      res.status(200).json(movie);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @name GetGenreByName
 * @route GET /genres/:name
 * @description Retrieve data about a genre by its name.
 * @access Private
 * @authentication JWT
 */
app.get(
  "/genres/:name",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { name } = req.params;
    try {
      const genre = await Genre.findOne({ Name: name });
      if (!genre) {
        return res.status(404).json({ error: "Genre not found" });
      }
      res.status(200).json(genre);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @name GetDirectorByName
 * @route GET /directors/:name
 * @description Retrieve data about a director by their name.
 * @access Private
 * @authentication JWT
 */
app.get(
  "/directors/:name",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { name } = req.params;
    try {
      const director = await Director.findOne({ Name: name });
      if (!director) {
        return res.status(404).json({ error: "Director not found" });
      }
      res.status(200).json(director);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @name AddMovie
 * @route POST /movies
 * @description Add a new movie to the database.
 * @access Private
 * @authentication JWT
 */
app.post(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const {
      Title,
      Description,
      Genre,
      Director,
      ImagePath,
      ImageURL,
      Featured,
    } = req.body;
    if (
      !Title ||
      !Description ||
      !Genre ||
      !Director ||
      (!ImagePath && !ImageURL)
    ) {
      return res
        .status(400)
        .json({ error: "All required fields must be provided" });
    } else {
      try {
        let imageURL = ImageURL;
        if (ImagePath) {
          imageURL = await uploadImage(ImagePath);
        }
        const newMovie = new Movie({
          Title,
          Description,
          Genre,
          Director,
          ImageURL: imageURL,
          Featured: Featured || false,
        });
        const savedMovie = await newMovie.save();
        res.status(201).json(savedMovie);
      } catch (err) {
        console.error("Error creating new movie:", err.message);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
