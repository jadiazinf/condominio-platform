import { ref, getDownloadURL, listAll } from 'firebase/storage'

import { getFirebaseStorage } from './config'

/**
 * Gets a fresh download URL for a user's profile photo from Firebase Storage.
 * This ensures the URL has a valid token and won't expire.
 *
 * @param userId - The user's ID
 * @returns The download URL or null if the photo doesn't exist
 */
export async function getProfilePhotoUrl(userId: string): Promise<string | null> {
  try {
    const storage = getFirebaseStorage()
    const profilePhotosRef = ref(storage, 'profile-photos')

    // List all files in profile-photos folder to find the user's photo
    // (we don't know the exact extension)
    const result = await listAll(profilePhotosRef)

    // Find the file that starts with the user's ID
    const userPhotoRef = result.items.find(item => item.name.startsWith(`${userId}.`))

    if (!userPhotoRef) {
      return null
    }

    // Get fresh download URL
    const url = await getDownloadURL(userPhotoRef)
    return url
  } catch {
    // Photo doesn't exist or other error
    return null
  }
}

/**
 * Extracts the storage path from a Firebase Storage URL.
 * Firebase Storage URLs contain the path encoded in the URL.
 *
 * @param url - The Firebase Storage URL
 * @returns The storage path or null if not a valid Firebase Storage URL
 */
export function extractStoragePathFromUrl(url: string): string | null {
  try {
    // Firebase Storage URLs have the format:
    // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded-path}?...
    const urlObj = new URL(url)

    if (!urlObj.hostname.includes('firebasestorage.googleapis.com')) {
      return null
    }

    const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/)
    if (!pathMatch) {
      return null
    }

    // Decode the path (it's URL encoded)
    return decodeURIComponent(pathMatch[1])
  } catch {
    return null
  }
}

/**
 * Gets a fresh download URL from an existing Firebase Storage URL.
 * Useful when you have a stored URL that might have an expired token.
 *
 * @param existingUrl - The existing Firebase Storage URL
 * @returns A fresh download URL or null if the file doesn't exist
 */
export async function refreshStorageUrl(existingUrl: string): Promise<string | null> {
  try {
    const storagePath = extractStoragePathFromUrl(existingUrl)

    if (!storagePath) {
      return null
    }

    const storage = getFirebaseStorage()
    const storageRef = ref(storage, storagePath)
    const url = await getDownloadURL(storageRef)

    return url
  } catch {
    return null
  }
}
