'use client'

import type { CardProps } from '@heroui/card'

import { Card, CardHeader, CardBody } from '@heroui/card'
import { cn } from '@heroui/theme'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

type TDistributionDataPoint = {
  name: string
  value: number
  color: string
}

interface DistributionChartProps extends Omit<CardProps, 'children'> {
  title: string
  data: TDistributionDataPoint[]
  centerLabel?: string
  centerValue?: string | number
}

export function DistributionChart({
  title,
  data,
  centerLabel,
  centerValue,
  className,
  ...props
}: DistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className={cn('border border-divider', className)} {...props}>
      <CardHeader className="px-4 pt-4 pb-0">
        <h3 className="text-lg font-semibold">{title}</h3>
      </CardHeader>
      <CardBody className="flex flex-col items-center justify-center px-4 pb-4">
        <div className="relative h-[200px] w-full">
          <ResponsiveContainer className="[&_.recharts-surface]:outline-hidden" width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={data}
                dataKey="value"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                align="center"
                content={({ payload }) => (
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {payload?.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-default-600">
                          {Math.round((data[index].value / total) * 100)}%
                        </span>
                        <span className="text-xs text-default-500">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                verticalAlign="bottom"
              />
            </PieChart>
          </ResponsiveContainer>
          {(centerLabel || centerValue) && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{ top: '-20px' }}
            >
              {centerLabel && <span className="text-xs text-default-500">{centerLabel}</span>}
              {centerValue && (
                <span className="text-xl font-bold text-foreground">{centerValue}</span>
              )}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
