export interface IPhoneCountryCode {
  code: string
  country: string
  flag: string
}

export const PHONE_COUNTRY_CODES: IPhoneCountryCode[] = [
  { code: '+49', country: 'Alemania', flag: '🇩🇪' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+53', country: 'Cuba', flag: '🇨🇺' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+1', country: 'Estados Unidos/Canadá', flag: '🇺🇸' },
  { code: '+33', country: 'Francia', flag: '🇫🇷' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳' },
  { code: '+39', country: 'Italia', flag: '🇮🇹' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+1787', country: 'Puerto Rico', flag: '🇵🇷' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '+1809', country: 'República Dominicana', flag: '🇩🇴' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
]

export const DEFAULT_PHONE_COUNTRY_CODE = '+58'

export const PHONE_PLACEHOLDERS: Record<string, string> = {
  '+49': '15112345678', // Alemania
  '+54': '1123456789', // Argentina
  '+591': '71234567', // Bolivia
  '+55': '11912345678', // Brasil
  '+56': '912345678', // Chile
  '+57': '3001234567', // Colombia
  '+506': '81234567', // Costa Rica
  '+53': '51234567', // Cuba
  '+593': '991234567', // Ecuador
  '+503': '70123456', // El Salvador
  '+34': '612345678', // España
  '+1': '5551234567', // Estados Unidos/Canadá
  '+33': '612345678', // Francia
  '+502': '51234567', // Guatemala
  '+504': '91234567', // Honduras
  '+39': '3123456789', // Italia
  '+52': '5512345678', // México
  '+505': '81234567', // Nicaragua
  '+507': '61234567', // Panamá
  '+595': '981123456', // Paraguay
  '+51': '987654321', // Perú
  '+351': '912345678', // Portugal
  '+1787': '7871234567', // Puerto Rico
  '+44': '7911123456', // Reino Unido
  '+1809': '8091234567', // República Dominicana
  '+598': '94123456', // Uruguay
  '+58': '4121234567', // Venezuela
}

export const DEFAULT_PHONE_PLACEHOLDER = '000 000 0000'
