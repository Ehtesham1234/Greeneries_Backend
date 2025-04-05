const axios = require("axios");
const FormData = require("form-data");
const apiKey = process.env.PLANT_API_KEY; // Your Pl@ntNet API key
const apiUrl = "https://my-api.plantnet.org/v2/identify/all"; // Correct URL

// Function to convert base64 string to buffer for image upload
const base64ToBuffer = (base64Image) => {
  // Remove the base64 metadata part (data:image/jpeg;base64,)
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
};

const identifyPlantByImage = async (imageBase64, organs = ["auto"]) => {
  try {
    // Create a new FormData instance
    const form = new FormData();

    // Append the image as a buffer to the form
    form.append("images", base64ToBuffer(imageBase64), {
      filename: "plant.jpg", // Placeholder name for the image
      contentType: "image/jpeg", // Adjust if necessary
    });

    // Append each organ individually
    organs.forEach((organ) => form.append("organs", organ));

    // Set query parameters
    const queryParams = new URLSearchParams({
      "include-related-images": "false",
      "no-reject": "false",
      "nb-results": "10",
      lang: "en",
      "api-key": apiKey,
    });

    // Send the request to the Pl@ntNet API
    const response = await axios.post(
      `${apiUrl}?${queryParams.toString()}`,
      form,
      {
        headers: {
          ...form.getHeaders(), // Required headers for multipart/form-data
        },
      }
    );

    return response.data; // Return the API response data
  } catch (error) {
    if (error.response) {
      console.error("Error[] ", error);
      console.error(
        "Error identifying plant by image data:",
        error.response.data
      );
    } else {
      console.error("Error[] ", error);
      console.error("Error identifying plant by image message:", error.message);
    }
    throw new Error("Failed to identify plant", error);
  }
};

module.exports = identifyPlantByImage;
