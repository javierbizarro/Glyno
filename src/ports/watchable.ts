// suscripción mínima para datos reactivos, sin atar la UI a ninguna librería
export interface Subscription {
  unsubscribe(): void
}

export interface Watchable<T> {
  subscribe(next: (value: T) => void, error?: (e: unknown) => void): Subscription
}
