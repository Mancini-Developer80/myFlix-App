const mongoose = require("mongoose");

const GenreSchema = new mongoose.Schema({
  Type: {
    type: String,
    required: true,
  },
  Description: {
    type: String,
    required: true,
  },
});

const DirectorSchema = new mongoose.Schema({
  Name: {
    type: String,
    required: true,
  },
  Birthdate: {
    type: Date,
    required: false,
  },
});

const MovieSchema = new mongoose.Schema({
  Title: {
    type: String,
    required: true,
  },
  Description: {
    type: String,
    required: true,
  },
  Genre: {
    type: GenreSchema,
    required: false,
  },
  Director: {
    type: DirectorSchema,
    required: true,
  },
});

const Movie = mongoose.model("Movie", MovieSchema);
const Genre = mongoose.model("Genre", GenreSchema);
const Director = mongoose.model("Director", DirectorSchema);

module.exports = { Movie, Genre, Director };
