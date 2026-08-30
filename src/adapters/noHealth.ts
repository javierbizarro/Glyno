import type { HealthSource } from '../ports/health'

/** No health store here (the web, and any platform without one): says so and stays quiet. */
export class NoHealth implements HealthSource {
  available() {
    return Promise.resolve(false)
  }

  request() {
    return Promise.resolve()
  }

  read() {
    return Promise.resolve([])
  }
}
