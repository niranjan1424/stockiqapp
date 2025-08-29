import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from "axios";

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const API_URL = "http://127.0.0.1:8000";

export async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: { "Content-Type": "application/json" },
      data: body,
    };
    const response = await axios(config);
    return response.data;
  } catch (error)
  {
    console.error("API Call Error:", error.response || error.message);
    throw new Error(error.response?.data?.detail || "An API error occurred. Please try again.");
  }
}