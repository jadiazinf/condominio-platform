'use client'

import { Avatar } from '@heroui/avatar'
import { Button } from '@heroui/button'
import { Camera, Trash2 } from 'lucide-react'

import { Section } from '../Section'
import { FormField } from '../FormField'
import { useProfilePhoto } from '../../hooks'

import { useTranslation } from '@/contexts'

export function ProfilePhotoSection() {
  const { t } = useTranslation()
  const {
    user,
    isUploading,
    isDeleting,
    isLoading,
    fileInputRef,
    handleFileSelect,
    openFilePicker,
    deletePhoto,
  } = useProfilePhoto()

  const displayName = getUserDisplayName()

  function getUserDisplayName(): string {
    if (!user) return ''
    if (user.displayName) return user.displayName
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()

    return fullName || user.email || ''
  }

  return (
    <Section
      description={t('settings.profile.photoDescription')}
      title={t('settings.profile.photo')}
    >
      <FormField>
        <div className="flex items-center gap-6">
          {/* Avatar with camera button */}
          <div className="relative">
            <Avatar
              className="w-24 h-24 text-large"
              imgProps={{
                loading: 'eager',
                fetchPriority: 'high',
              }}
              name={displayName}
              src={user?.photoUrl || undefined}
            />
            <Button
              isIconOnly
              className="absolute bottom-0 right-0 bg-primary text-white shadow-md"
              isDisabled={isLoading}
              radius="full"
              size="sm"
              onPress={openFilePicker}
            >
              <Camera size={14} />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              isDisabled={isLoading}
              isLoading={isUploading}
              size="sm"
              variant="bordered"
              onPress={openFilePicker}
            >
              {t('settings.profile.uploadPhoto')}
            </Button>
            {user?.photoUrl && (
              <Button
                color="danger"
                isDisabled={isLoading}
                isLoading={isDeleting}
                size="sm"
                startContent={!isDeleting && <Trash2 size={14} />}
                variant="light"
                onPress={deletePhoto}
              >
                {t('settings.profile.removePhoto')}
              </Button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            accept="image/*"
            aria-label={t('settings.profile.uploadPhoto')}
            className="hidden"
            type="file"
            onChange={handleFileSelect}
          />
        </div>
      </FormField>
    </Section>
  )
}
