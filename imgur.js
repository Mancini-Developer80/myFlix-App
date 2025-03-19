const axios = require("axios");

const uploadImage = async (imagePath) => {
  const clientId = process.env.IMGUR_CLIENT_ID;
  const url = "https://api.imgur.com/3/image";

  try {
    const response = await axios.post(
      url,
      { image: imagePath },
      {
        headers: {
          Authorization: `Client-ID ${clientId}`,
        },
      }
    );

    return response.data.data.link;
  } catch (error) {
    console.error("Error uploading image to Imgur:", error);
    throw new Error("Failed to upload image to Imgur");
  }
};

module.exports = { uploadImage };
