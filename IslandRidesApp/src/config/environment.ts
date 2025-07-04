import { Platform } from 'react-native';

const ENV = {
  dev: {
    apiUrl: 'http://localhost:3003',
    wsUrl: 'ws://localhost:3003',
    environment: 'development'
  },
  staging: {
    apiUrl: 'https://staging-api.islandrides.com',
    wsUrl: 'wss://staging-api.islandrides.com',
    environment: 'staging'
  },
  prod: {
    apiUrl: 'https://api.islandrides.com',
    wsUrl: 'wss://api.islandrides.com',
    environment: 'production'
  }
};

const getEnvVars = (env = process.env.NODE_ENV) => {
  if (env === 'production') {
    return ENV.prod;
  }
  if (env === 'staging') {
    return ENV.staging;
  }
  return ENV.dev;
};

export default getEnvVars;
