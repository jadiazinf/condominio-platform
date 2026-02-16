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
  '+49': '151 1234 5678',       // Alemania
  '+54': '11 2345-6789',        // Argentina
  '+591': '7123 4567',          // Bolivia
  '+55': '11 91234-5678',       // Brasil
  '+56': '9 1234 5678',         // Chile
  '+57': '300 123 4567',        // Colombia
  '+506': '8123 4567',          // Costa Rica
  '+53': '5 123 4567',          // Cuba
  '+593': '99 123 4567',        // Ecuador
  '+503': '7012 3456',          // El Salvador
  '+34': '612 345 678',         // España
  '+1': '(555) 123-4567',       // Estados Unidos/Canadá
  '+33': '6 12 34 56 78',       // Francia
  '+502': '5123 4567',          // Guatemala
  '+504': '9123 4567',          // Honduras
  '+39': '312 345 6789',        // Italia
  '+52': '55 1234 5678',        // México
  '+505': '8123 4567',          // Nicaragua
  '+507': '6123 4567',          // Panamá
  '+595': '981 123 456',        // Paraguay
  '+51': '987 654 321',         // Perú
  '+351': '912 345 678',        // Portugal
  '+1787': '(787) 123-4567',    // Puerto Rico
  '+44': '7911 123456',         // Reino Unido
  '+1809': '(809) 123-4567',    // República Dominicana
  '+598': '94 123 456',         // Uruguay
  '+58': '(412) 123-4567',      // Venezuela
}

export const DEFAULT_PHONE_PLACEHOLDER = '000 000 0000'
