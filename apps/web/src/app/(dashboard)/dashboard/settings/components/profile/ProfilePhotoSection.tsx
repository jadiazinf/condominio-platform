'use client'

import { Avatar } from '@heroui/avatar'
import { Button } from '@heroui/button'
import { Camera, Trash2 } from 'lucide-react'

import { useTranslation } from '@/contexts'

import { Section } from '../Section'
import { FormField } from '../FormField'
import { useProfilePhoto } from '../../hooks'

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
      title={t('settings.profile.photo')}
      description={t('settings.profile.photoDescription')}
    >
      <FormField>
        <div className="flex items-center gap-6">
          {/* Avatar with camera button */}
          <div className="relative">
            <Avatar
              className="w-24 h-24 text-large"
              name={displayName}
              src={user?.photoUrl || undefined}
              isBordered
              color="primary"
              imgProps={{ crossOrigin: 'anonymous' }}
            />
            <Button
              isIconOnly
              className="absolute bottom-0 right-0 bg-primary text-white shadow-md"
              radius="full"
              size="sm"
              onPress={openFilePicker}
              isDisabled={isLoading}
            >
              <Camera size={14} />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              size="sm"
              variant="bordered"
              onPress={openFilePicker}
              isLoading={isUploading}
              isDisabled={isLoading}
            >
              {t('settings.profile.uploadPhoto')}
            </Button>
            {user?.photoUrl && (
              <Button
                size="sm"
                variant="light"
                color="danger"
                startContent={!isDeleting && <Trash2 size={14} />}
                onPress={deletePhoto}
                isLoading={isDeleting}
                isDisabled={isLoading}
              >
                {t('settings.profile.removePhoto')}
              </Button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </FormField>
    </Section>
  )
}
