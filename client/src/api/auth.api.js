import axios from "axios";
export default async function login(urlapiback, data) {
  try {
    const response = await axios.post(urlapiback, data);
    if (response.status === 200)  return response.data;
  } catch (error) {

    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Erreur lors de la connexion";
    console.log(message);
    throw error;
  }
}
