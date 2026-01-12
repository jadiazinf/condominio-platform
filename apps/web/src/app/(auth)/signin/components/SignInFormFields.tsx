'use client'

import { useState } from 'react'
import { Checkbox } from '@heroui/checkbox'
import { Link } from '@heroui/link'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'

import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'

export interface SignInFormData {
  email: string
  password: string
  rememberMe: boolean
}

interface SignInFormFieldsProps {
  onSubmit: (data: SignInFormData) => void
  onGoogleSignIn: () => void
}

export function SignInFormFields({ onSubmit, onGoogleSignIn }: SignInFormFieldsProps) {
  const [showPassword, setShowPassword] = useState(false)

  const { control, handleSubmit } = useForm<SignInFormData>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  return (
    <>
      {/* Form */}
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Typography className="mb-2" variant="body2">
            Email
          </Typography>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                isRequired
                placeholder="Ingresa tu email"
                size="lg"
                startContent={<Mail className="w-5 h-5 text-default-400" />}
                type="email"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div>
          <Typography className="mb-2" variant="body2">
            Contraseña
          </Typography>
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                isRequired
                endContent={
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-default-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-default-400" />
                    )}
                  </button>
                }
                placeholder="Ingresa tu contraseña"
                size="lg"
                startContent={<Lock className="w-5 h-5 text-default-400" />}
                type={showPassword ? 'text' : 'password'}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="flex items-center justify-between">
          <Controller
            control={control}
            name="rememberMe"
            render={({ field }) => (
              <Checkbox isSelected={field.value} size="sm" onValueChange={field.onChange}>
                <Typography variant="body2">Recuérdame</Typography>
              </Checkbox>
            )}
          />
          <Link className="text-sm" href="/forgot-password">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button
          fullWidth
          className="w-full font-semibold dark:bg-primary/30 dark:text-white dark:hover:bg-primary/40"
          color="primary"
          size="lg"
          type="submit"
        >
          Iniciar Sesión
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-divider" />
        <Typography color="muted" variant="body2">
          O inicia con
        </Typography>
        <div className="flex-1 h-px bg-divider" />
      </div>

      {/* Social Sign In */}
      <div className="space-y-3">
        <Button
          fullWidth
          className="w-full font-semibold"
          size="lg"
          startContent={
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          }
          variant="bordered"
          onPress={onGoogleSignIn}
        >
          Continuar con Google
        </Button>
      </div>
    </>
  )
}
