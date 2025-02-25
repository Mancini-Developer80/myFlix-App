Based on the gathered information, here's a draft for your `README.md`:

---

# myFlix-App API

## Introduction
The myFlix-App API allows users to access information about different movies, directors, and genres, as well as manage their user profiles and favorite movies.

## Features
- User Registration and Authentication
- Fetch all movies or specific movie details
- Retrieve information about genres and directors
- Manage user profiles and favorite movies

## Setup and Installation
To get started with the myFlix-App API, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Mancini-Developer80/myFlix-App.git
   ```
2. **Install dependencies:**
   ```bash
   cd myFlix-App
   npm install
   ```
3. **Configure environment variables:**
   Create a `.env` file and add the necessary environment variables (e.g., database connection string, JWT secret).

4. **Run the server:**
   ```bash
   npm start
   ```

## Authentication
The API uses JSON Web Tokens (JWT) for authentication. Ensure to include the JWT token in the Authorization header for protected routes.

## Endpoints

### User Endpoints

- **Register a new user**
  - Method: `POST`
  - URL: `/users`
  - Request Body:
    ```json
    {
      "username": "username",
      "email": "email",
      "password": "password"
    }
    ```
  - Response:
    ```json
    {
      "_id": "userId",
      "username": "username",
      "email": "email",
      "favoriteMovies": []
    }
    ```

- **Update user info**
  - Method: `PUT`
  - URL: `/users/:id`
  - Authentication: JWT
  - Request Body:
    ```json
    {
      "username": "username",
      "email": "email",
      "password": "password"
    }
    ```
  - Response:
    ```json
    {
      "_id": "userId",
      "username": "username",
      "email": "email",
      "favoriteMovies": []
    }
    ```

- **Deregister user**
  - Method: `DELETE`
  - URL: `/users/:id`
  - Authentication: JWT
  - Response:
    ```json
    {
      "message": "User deregistered"
    }
    ```

- **Get user's favorite movies**
  - Method: `GET`
  - URL: `/users/:id/favoriteMovies`
  - Authentication: JWT
  - Response:
    ```json
    {
      "favoriteMovies": [
        {
          "_id": "movieId",
          "Title": "movieTitle",
          "Description": "movieDescription",
          "Genre": {
            "Type": "genreType",
            "Description": "genreDescription"
          },
          "Director": {
            "Name": "directorName",
            "Birthdate": "directorBirthdate"
          }
        }
      ]
    }
    ```

### Movie Endpoints

- **Get all movies**
  - Method: `GET`
  - URL: `/movies`
  - Authentication: JWT
  - Response:
    ```json
    {
      "movies": [
        {
          "_id": "movieId",
          "Title": "movieTitle",
          "Description": "movieDescription",
          "Genre": {
            "Type": "genreType",
            "Description": "genreDescription"
          },
          "Director": {
            "Name": "directorName",
            "Birthdate": "directorBirthdate"
          }
        }
      ]
    }
    ```

- **Get movie by title**
  - Method: `GET`
  - URL: `/movies/:title`
  - Authentication: JWT
  - Response:
    ```json
    {
      "_id": "movieId",
      "Title": "movieTitle",
      "Description": "movieDescription",
      "Genre": {
        "Type": "genreType",
        "Description": "genreDescription"
      },
      "Director": {
        "Name": "directorName",
        "Birthdate": "directorBirthdate"
      }
    }
    ```

- **Get genre by name**
  - Method: `GET`
  - URL: `/genres/:name`
  - Authentication: JWT
  - Response:
    ```json
    {
      "_id": "genreId",
      "Type": "genreType",
      "Description": "genreDescription"
    }
    ```

- **Get director by name**
  - Method: `GET`
  - URL: `/directors/:name`
  - Authentication: JWT
  - Response:
    ```json
    {
      "_id": "directorId",
      "Name": "directorName",
      "Birthdate": "directorBirthdate"
    }
    ```

## License
This project is licensed under the MIT License.

For more detailed information, you can check the [documentation](https://github.com/Mancini-Developer80/myFlix-App/blob/main/public/documentation.html).

---

Feel free to customize this template further to better fit your project's needs.
