// minimal subscription for reactive data, without tying the UI to any library
export interface Subscription {
  unsubscribe(): void
}

export interface Watchable<T> {
  subscribe(next: (value: T) => void, error?: (e: unknown) => void): Subscription
}
