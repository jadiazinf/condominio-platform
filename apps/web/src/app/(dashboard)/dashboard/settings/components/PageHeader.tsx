import { Typography } from '@/ui/components/typography'

interface IPageHeaderProps {
  title: string
  description: string
}

export function PageHeader({ title, description }: IPageHeaderProps) {
  return (
    <header>
      <Typography variant="h3">{title}</Typography>
      <Typography className="mt-1" color="muted" variant="body2">
        {description}
      </Typography>
    </header>
  )
}
