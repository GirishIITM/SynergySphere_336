import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Utility function for handling API errors
export function getErrorMessage(error) {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.msg) return error.msg;
  return 'An unexpected error occurred';
}

// Utility function for formatting file sizes
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility function for validating image files
export function isValidImageFile(file, maxSizeInMB = 5) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = maxSizeInMB * 1024 * 1024;
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Please select a valid image file (JPG, PNG, GIF, or WEBP)' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: `Image size must be less than ${maxSizeInMB}MB` };
  }
  
  return { valid: true };
}
