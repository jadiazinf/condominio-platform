'use client'

import { useState } from 'react'
import { Edit2, Save, X } from 'lucide-react'

import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'
import { Textarea } from '@/ui/components/textarea'

interface ITicketSolutionFieldProps {
  solution: string | null
  label: string
  placeholder: string
  onSave: (solution: string) => void
  isLoading?: boolean
}

export function TicketSolutionField({
  solution,
  label,
  placeholder,
  onSave,
  isLoading = false,
}: ITicketSolutionFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(solution || '')

  const handleSave = () => {
    onSave(value)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setValue(solution || '')
    setIsEditing(false)
  }

  if (!isEditing && !solution) {
    return (
      <div>
        <Typography color="muted" variant="caption">
          {label}
        </Typography>
        <div className="mt-2">
          <Button
            color="default"
            isDisabled={isLoading}
            size="sm"
            startContent={<Edit2 size={16} />}
            variant="flat"
            onPress={() => setIsEditing(true)}
          >
            Agregar solución
          </Button>
        </div>
      </div>
    )
  }

  if (!isEditing && solution) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <Typography color="muted" variant="caption">
            {label}
          </Typography>
          <Button
            isIconOnly
            color="default"
            isDisabled={isLoading}
            size="sm"
            variant="light"
            onPress={() => setIsEditing(true)}
          >
            <Edit2 size={16} />
          </Button>
        </div>
        <div className="mt-1 rounded-lg bg-default-100 p-3">
          <Typography variant="body2">{solution}</Typography>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Typography color="muted" variant="caption">
        {label}
      </Typography>
      <div className="mt-2 space-y-2">
        <Textarea
          isDisabled={isLoading}
          minRows={4}
          placeholder={placeholder}
          size="md"
          value={value}
          variant="bordered"
          onValueChange={setValue}
        />
        <div className="flex gap-2">
          <Button
            color="primary"
            isDisabled={isLoading}
            isLoading={isLoading}
            size="sm"
            startContent={!isLoading && <Save size={16} />}
            variant="flat"
            onPress={handleSave}
          >
            Guardar
          </Button>
          <Button
            color="default"
            isDisabled={isLoading}
            size="sm"
            startContent={<X size={16} />}
            variant="light"
            onPress={handleCancel}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
