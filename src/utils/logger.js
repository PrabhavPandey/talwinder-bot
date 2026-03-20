const winston = require('winston');
const path = require('path');

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

// Only write logs to files if NOT running on Vercel
// Vercel has a read-only filesystem (except /tmp) and captures stdout automatically
if (!process.env.VERCEL) {
  transports.push(
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log') 
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'talwinder-bot' },
  transports: transports
});

module.exports = logger;
