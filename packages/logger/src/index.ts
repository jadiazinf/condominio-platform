import pino from 'pino'

// Uses process.env directly because environment.ts imports logger,
// creating a circular dependency if we import env here.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
})

export default logger
