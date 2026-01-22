'use client'

import { useState, useCallback, useRef } from 'react'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { updateProfile, HttpError } from '@packages/http-client'

import { useAuth, useUser, useTranslation } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { getFirebaseStorage } from '@/libs/firebase/config'

interface UseProfilePhotoOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useProfilePhoto(options: UseProfilePhotoOptions = {}) {
  const { user: firebaseUser } = useAuth()
  const { user, setUser } = useUser()
  const { t } = useTranslation()
  const toast = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadPhoto = useCallback(
    async (file: File) => {
      if (!firebaseUser || !user) return

      try {
        setIsUploading(true)

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(t('settings.profile.photoInvalidType'))
          return
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
          toast.error(t('settings.profile.photoTooLarge'))
          return
        }

        const storage = getFirebaseStorage()
        const fileExtension = file.name.split('.').pop() || 'jpg'
        const fileName = `profile-photos/${user.id}.${fileExtension}`
        const storageRef = ref(storage, fileName)

        // Upload file
        await uploadBytes(storageRef, file)

        // Get download URL
        const photoUrl = await getDownloadURL(storageRef)

        // Update user profile with new photo URL
        const token = await firebaseUser.getIdToken()
        const updatedUser = await updateProfile(token, { photoUrl })

        setUser(updatedUser)
        toast.success(t('settings.profile.photoUploadSuccess'))
        options.onSuccess?.()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')

        if (HttpError.isHttpError(err)) {
          toast.error(err.message)
        } else {
          toast.error(t('settings.profile.photoUploadError'))
        }

        options.onError?.(error)
      } finally {
        setIsUploading(false)
      }
    },
    [firebaseUser, user, setUser, toast, t, options]
  )

  const deletePhoto = useCallback(async () => {
    if (!firebaseUser || !user) return

    try {
      setIsDeleting(true)

      // Delete from storage if exists
      if (user.photoUrl) {
        try {
          const storage = getFirebaseStorage()
          const storageRef = ref(storage, `profile-photos/${user.id}`)
          await deleteObject(storageRef)
        } catch {
          // Ignore error if file doesn't exist
        }
      }

      // Update user profile to remove photo URL
      const token = await firebaseUser.getIdToken()
      const updatedUser = await updateProfile(token, { photoUrl: null })

      setUser(updatedUser)
      toast.success(t('settings.profile.photoDeleteSuccess'))
      options.onSuccess?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')

      if (HttpError.isHttpError(err)) {
        toast.error(err.message)
      } else {
        toast.error(t('settings.profile.photoDeleteError'))
      }

      options.onError?.(error)
    } finally {
      setIsDeleting(false)
    }
  }, [firebaseUser, user, setUser, toast, t, options])

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        uploadPhoto(file)
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [uploadPhoto]
  )

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return {
    user,
    isUploading,
    isDeleting,
    isLoading: isUploading || isDeleting,
    fileInputRef,
    uploadPhoto,
    deletePhoto,
    handleFileSelect,
    openFilePicker,
  }
}
