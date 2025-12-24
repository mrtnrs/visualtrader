export type ApiClient = {
  baseUrl: string
}

export function createApiClient(baseUrl: string): ApiClient {
  return { baseUrl }
}
