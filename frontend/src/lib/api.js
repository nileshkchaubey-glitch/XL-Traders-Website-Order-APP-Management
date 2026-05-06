import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

// Helpers
export const imgUrl = (filename) => {
  if (!filename) return "";
  if (filename.startsWith("http")) return filename;
  return `${API}/uploads/${filename}`;
};
