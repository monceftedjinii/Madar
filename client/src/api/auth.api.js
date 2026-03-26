import axios from "axios";
import { clearSession } from "../app/auth";

export default async function login(urlapiback, data) {
  try {
    const response = await axios.post(urlapiback, data);
    if (response.status === 200) return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Erreur lors de la connexion";
    console.log(message);
    throw error;
  }
}

export async function logout() {
  try {
    await axios.post("/api/auth/logout/");
  } catch (error) {
    console.error("Logout failed", error);
  } finally {
    clearSession();
  }
}
