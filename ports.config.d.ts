declare const ports: {
  VITE_DEV_PORT: number;
  VITE_PREVIEW_PORT: number;
  API_SERVER_PORT: number;
  PYTHON_AI_PORT: number;
  OLLAMA_PORT: number;
  POSTGRES_PORT: number;
  REDIS_PORT: number;
  PLAYWRIGHT_BASE_URL: string;
  PRODUCTION_HTTP_PORT: number;
  PRODUCTION_HTTPS_PORT: number;
  getPort(name: string): number;
  validate(): boolean;
};

export default ports;
