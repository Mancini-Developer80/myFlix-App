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
 * @param Retrieve a list of all users. Only accessible by admins.
 * @param {Object} req - The request object.
 * @param {Object} req.user - The authenticated user object.
 * @param {boolean} req.user.isAdmin - Indicates if the user is an admin.
 * @param {Object} res - The response object.
 * @returns {Array} A list of all users in the database.
 * @throws {403} Access denied. Admins only.
 * @throws {500} Internal server error.
 * @example
 * // Example request:
 * GET /users
 * Headers: { Authorization: "Bearer <JWT_TOKEN>" }
 *
 * // Example response:
 * [
 *   {
 *     "_id": "12345",
 *     "username": "john_doe",
 *     "email": "john@example.com",
 *     "favoriteMovies": []
 *   },
 *   {
 *     "_id": "67890",
 *     "username": "jane_doe",
 *     "email": "jane@example.com",
 *     "favoriteMovies": ["54321"]
 *   }
 * ]
 */
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
/**
 *
 * @param Retrieve a user's information by their ID.
 * @param {string} id - The ID of the user to retrieve.
 * @returns {Object} The user's information if found, or an error message if not.
 * @throws {404} User not found.
 * @throws {500} Internal server error.
 */
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

/**
 *
 * @param Register a new user.
 * @param {string} username - The username of the new user.
 * @param {string} email - The email address of the new user.
 * @param {string} password - The password of the new user.
 * @returns {Object} The newly created user object.
 * @throws {400} All fields are required.
 * @throws {500} Internal server error.
 */
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

/**
 *
 * @param Update a user's information by their ID.
 * @param {string} id - The ID of the user to update.
 * @param {string} [username] - The new username for the user.
 * @param {string} [email] - The new email address for the user.
 * @param {string} [password] - The new password for the user.
 * @returns {Object} The updated user object if successful.
 * @throws {404} User not found.
 * @throws {500} Internal server error.
 */
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

/**
 *
 * @param Add a movie to a user's list of favorite movies.
 * @param {string} id - The ID of the user.
 * @param {string} movieTitle - The title of the movie to add.
 * @returns {Object} The updated user object with the added favorite movie.
 * @throws {404} User not found.
 * @throws {404} Movie not found.
 * @throws {400} Movie already in favorite list.
 * @throws {500} Internal server error.
 */
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

/**
 *
 * @param Remove a movie from a user's list of favorite movies.
 * @param {string} id - The ID of the user.
 * @param {string} movieTitle - The title of the movie to remove.
 * @returns {Object} The updated user object without the removed favorite movie.
 * @throws {404} User not found.
 * @throws {404} Movie not found.
 * @throws {500} Internal server error.
 */
app.delete(
  "/users/:id/movies/:movieTitle",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { id, movieTitle } = req.params;
    console.log(`Deleting movie: ${movieTitle} for user: ${id}`);
    try {
      const user = await User.findById(id);
      if (!user) {
        console.error("User not found");
        return res.status(404).send("User not found");
      }
      const movie = await Movie.findOne({ Title: movieTitle });
      if (!movie) {
        console.error("Movie not found");
        return res.status(404).send("Movie not found");
      }
      console.log(`Removing movie: ${movie._id} from user's favorite movies`);
      user.favoriteMovies = user.favoriteMovies.filter(
        (movieId) => movieId.toString() !== movie._id.toString()
      );
      const updatedUser = await user.save();
      console.log(
        `Updated user's favorite movies: ${updatedUser.favoriteMovies}`
      );
      res.status(200).json(updatedUser);
    } catch (err) {
      console.error("Error deleting movie:", err.message);
      res.status(500).send(err.message);
    }
  }
);

/**
 *
 * @param Deregister a user by their ID.
 * @param {string} id - The ID of the user to deregister.
 * @returns {string} A success message if the user is deregistered.
 * @throws {404} User not found.
 * @throws {500} Internal server error.
 */
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

/**
 *
 * @param Retrieve a user's list of favorite movies by their ID.
 * @param {string} id - The ID of the user whose favorite movies are to be retrieved.
 * @returns {Array} A list of the user's favorite movies.
 * @throws {404} User not found.
 * @throws {500} Internal server error.
 */
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

/**
 *
 * @param Retrieve a list of all movies.
 * @returns {Array} A list of all movies in the database.
 * @throws {500} Internal server error.
 */
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const movies = await Movie.find();
      res.status(200).json(movies);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

/**
 *
 * @param Retrieve data about a movie by its title.
 * @param {string} title - The title of the movie to retrieve.
 * @returns {Object} The movie's information if found.
 * @throws {404} Movie not found.
 * @throws {500} Internal server error.
 */
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

/**
 *
 * @param Retrieve data about a genre by its name.
 * @param {string} name - The name of the genre to retrieve.
 * @returns {Object} The genre's information if found.
 * @throws {404} Genre not found.
 * @throws {500} Internal server error.
 */
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

/**
 *
 * @param Retrieve data about a director by their name.
 * @param {string} name - The name of the director to retrieve.
 * @returns {Object} The director's information if found.
 * @throws {404} Director not found.
 * @throws {500} Internal server error.
 */
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

/**
 *
 * @param Add a new movie to the database.
 * @param {string} Title - The title of the movie.
 * @param {string} Description - A brief description of the movie.
 * @param {string} Genre - The genre of the movie.
 * @param {string} Director - The director of the movie.
 * @param {string} [ImagePath] - The local path to the movie's image (optional).
 * @param {string} [ImageURL] - The URL of the movie's image (optional, used if ImagePath is not provided).
 * @param {boolean} [Featured=false] - Whether the movie is featured or not.
 * @returns {Object} The newly created movie object.
 * @throws {400} All required fields must be provided.
 * @throws {500} Internal server error.
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
      return res.status(400).send("All fields are required");
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
        res.status(500).send("Internal server error");
      }
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
