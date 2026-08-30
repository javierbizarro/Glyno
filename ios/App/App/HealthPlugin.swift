import Capacitor
import Foundation
import HealthKit

/**
 Reads Apple Salud for the diary. Read-only on purpose: Glyno never writes back, and nothing
 read here leaves the phone.

 The JavaScript side owns validation, dedupe and the plausible ranges (`app/healthImport.ts`);
 this plugin only turns HealthKit objects into the sample shape that pipeline already knows.
 Every kind is asked for by its official identifier — never by a localised name — and point
 samples carry their HealthKit UUID so a reading corrected later lands on the same diary row.
 */
@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthPlugin"
    public let jsName = "Health"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()

    /// local time with no zone suffix: the JS side reads these as local instants
    private lazy var instant: DateFormatter = formatter("yyyy-MM-dd'T'HH:mm:ss")
    private lazy var day: DateFormatter = formatter("yyyy-MM-dd")

    private func formatter(_ format: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = format
        return f
    }

    private var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = [HKObjectType.workoutType()]
        let quantities: [HKQuantityTypeIdentifier] = [
            .bloodGlucose, .stepCount, .bodyMass, .appleExerciseTime, .distanceCycling,
            .bloodPressureSystolic, .bloodPressureDiastolic,
        ]
        for id in quantities {
            if let t = HKObjectType.quantityType(forIdentifier: id) { types.insert(t) }
        }
        if let sleep = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { types.insert(sleep) }
        // NOT the blood-pressure correlation: HealthKit refuses read authorisation for
        // correlation types and throws. Permission is asked for systolic and diastolic
        // above; the correlation is only a way of reading the pair back together.
        return types
    }

    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func request(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["available": false])
            return
        }
        // iOS never reports whether READ access was granted — refusing looks exactly like
        // having no data — so this resolves either way and the answer is what comes back.
        store.requestAuthorization(toShare: [], read: readTypes) { _, error in
            if let error { call.reject(error.localizedDescription); return }
            call.resolve(["available": true])
        }
    }

    @objc func read(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["samples": []])
            return
        }
        let from = Date(timeIntervalSince1970: call.getDouble("from", 0) / 1000)
        let to = Date(timeIntervalSince1970: call.getDouble("to", Double(Date().timeIntervalSince1970 * 1000)) / 1000)
        let period = HKQuery.predicateForSamples(withStart: from, end: to, options: [.strictStartDate])

        var samples: [[String: Any]] = []
        let lock = NSLock()
        let group = DispatchGroup()
        let collect: ([[String: Any]]) -> Void = { found in
            lock.lock()
            samples.append(contentsOf: found)
            lock.unlock()
        }

        readGlucose(period, group, collect)
        readBloodPressure(period, group, collect)
        readWorkouts(period, group, collect)
        readWeight(period, group, collect)
        readDailySum(.stepCount, kind: "steps", unit: HKUnit.count(), from: from, to: to, group, collect)
        readDailySum(.appleExerciseTime, kind: "activity", unit: .minute(), from: from, to: to, group, collect)
        readDailySum(.distanceCycling, kind: "cycling", unit: .meterUnit(with: .kilo), from: from, to: to, group, collect)
        readSleep(period, group, collect)

        group.notify(queue: .main) { call.resolve(["samples": samples]) }
    }

    // MARK: - point samples

    private func readGlucose(_ period: NSPredicate, _ group: DispatchGroup, _ collect: @escaping ([[String: Any]]) -> Void) {
        guard let type = HKObjectType.quantityType(forIdentifier: .bloodGlucose) else { return }
        // mg/dL: mass over volume, built from units rather than parsed from a string
        let unit = HKUnit.gramUnit(with: .milli).unitDivided(by: HKUnit.literUnit(with: .deci))
        query(type, period, group) { results in
            collect(results.compactMap { sample in
                guard let q = sample as? HKQuantitySample else { return nil }
                return [
                    "kind": "glucose",
                    "id": q.uuid.uuidString,
                    "ts": self.instant.string(from: q.startDate),
                    "value": q.quantity.doubleValue(for: unit).rounded(),
                ]
            })
        }
    }

    private func readBloodPressure(_ period: NSPredicate, _ group: DispatchGroup, _ collect: @escaping ([[String: Any]]) -> Void) {
        guard let type = HKObjectType.correlationType(forIdentifier: .bloodPressure),
              let sysType = HKObjectType.quantityType(forIdentifier: .bloodPressureSystolic),
              let diaType = HKObjectType.quantityType(forIdentifier: .bloodPressureDiastolic)
        else { return }
        let unit = HKUnit.millimeterOfMercury()
        query(type, period, group) { results in
            collect(results.compactMap { sample in
                guard let c = sample as? HKCorrelation,
                      let sys = (c.objects(for: sysType).first as? HKQuantitySample),
                      let dia = (c.objects(for: diaType).first as? HKQuantitySample)
                else { return nil }
                return [
                    "kind": "bp",
                    "id": c.uuid.uuidString,
                    "ts": self.instant.string(from: c.startDate),
                    "sys": sys.quantity.doubleValue(for: unit).rounded(),
                    "dia": dia.quantity.doubleValue(for: unit).rounded(),
                ]
            })
        }
    }

    private func readWorkouts(_ period: NSPredicate, _ group: DispatchGroup, _ collect: @escaping ([[String: Any]]) -> Void) {
        query(HKObjectType.workoutType(), period, group) { results in
            collect(results.compactMap { sample in
                guard let w = sample as? HKWorkout else { return nil }
                var row: [String: Any] = [
                    "kind": "exercise",
                    "id": w.uuid.uuidString,
                    "ts": self.instant.string(from: w.startDate),
                    "minutes": (w.duration / 60).rounded(),
                    "label": Self.label(for: w.workoutActivityType),
                ]
                if let km = self.distanceKm(of: w) { row["km"] = km }
                return row
            })
        }
    }

    /// distance is asked per type: walking/running and cycling live in different statistics
    private func distanceKm(of workout: HKWorkout) -> Double? {
        let ids: [HKQuantityTypeIdentifier] = [.distanceWalkingRunning, .distanceCycling, .distanceSwimming]
        for id in ids {
            guard let type = HKObjectType.quantityType(forIdentifier: id),
                  let sum = workout.statistics(for: type)?.sumQuantity()
            else { continue }
            let km = sum.doubleValue(for: .meterUnit(with: .kilo))
            if km > 0 { return (km * 10).rounded() / 10 }
        }
        return nil
    }

    // MARK: - daily aggregates

    /// the last weight of each day: stepping on the scale twice is one weight, not two
    private func readWeight(_ period: NSPredicate, _ group: DispatchGroup, _ collect: @escaping ([[String: Any]]) -> Void) {
        guard let type = HKObjectType.quantityType(forIdentifier: .bodyMass) else { return }
        query(type, period, group) { results in
            var latest: [String: HKQuantitySample] = [:]
            for case let q as HKQuantitySample in results {
                let key = self.day.string(from: q.startDate)
                if let prev = latest[key], prev.startDate > q.startDate { continue }
                latest[key] = q
            }
            collect(latest.map { date, q in
                ["kind": "weight", "date": date, "value": q.quantity.doubleValue(for: .gramUnit(with: .kilo))]
            })
        }
    }

    private func readDailySum(
        _ id: HKQuantityTypeIdentifier, kind: String, unit: HKUnit, from: Date, to: Date,
        _ group: DispatchGroup, _ collect: @escaping ([[String: Any]]) -> Void
    ) {
        guard let type = HKObjectType.quantityType(forIdentifier: id) else { return }
        let calendar = Calendar.current
        let anchor = calendar.startOfDay(for: from)
        let query = HKStatisticsCollectionQuery(
            quantityType: type,
            quantitySamplePredicate: HKQuery.predicateForSamples(withStart: from, end: to, options: [.strictStartDate]),
            options: .cumulativeSum,
            anchorDate: anchor,
            intervalComponents: DateComponents(day: 1),
        )
        group.enter()
        query.initialResultsHandler = { _, collection, _ in
            var rows: [[String: Any]] = []
            collection?.enumerateStatistics(from: anchor, to: to) { stats, _ in
                guard let sum = stats.sumQuantity() else { return }
                let value = sum.doubleValue(for: unit)
                guard value > 0 else { return }
                let date = self.day.string(from: stats.startDate)
                // minutes and totals travel in different fields, as the diary expects them
                rows.append(kind == "activity"
                    ? ["kind": kind, "date": date, "minutes": value.rounded()]
                    : ["kind": kind, "date": date, "value": kind == "cycling" ? (value * 10).rounded() / 10 : value.rounded()])
            }
            collect(rows)
            group.leave()
        }
        store.execute(query)
    }

    /// Minutes actually asleep per night, filed on the morning it ended. Time merely in bed
    /// is not sleep, and the states are matched by constant, never by their Spanish name.
    private func readSleep(_ period: NSPredicate, _ group: DispatchGroup, _ collect: @escaping ([[String: Any]]) -> Void) {
        guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return }
        let asleep: Set<Int> = [
            HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
            HKCategoryValueSleepAnalysis.asleepCore.rawValue,
            HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
            HKCategoryValueSleepAnalysis.asleepREM.rawValue,
        ]
        query(type, period, group) { results in
            var minutes: [String: Double] = [:]
            for case let c as HKCategorySample in results where asleep.contains(c.value) {
                let key = self.day.string(from: c.endDate)
                minutes[key, default: 0] += c.endDate.timeIntervalSince(c.startDate) / 60
            }
            collect(minutes.map { date, mins in ["kind": "sleep", "date": date, "minutes": mins.rounded()] })
        }
    }

    // MARK: - plumbing

    private func query(
        _ type: HKSampleType, _ period: NSPredicate, _ group: DispatchGroup,
        _ handle: @escaping ([HKSample]) -> Void
    ) {
        group.enter()
        let q = HKSampleQuery(sampleType: type, predicate: period, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, results, _ in
            // a refusal and an empty store look the same here, and both mean "nothing to add"
            handle(results ?? [])
            group.leave()
        }
        store.execute(q)
    }

    /// Spanish labels for what the diary shows; anything unmapped stays generic on purpose
    private static func label(for activity: HKWorkoutActivityType) -> String {
        switch activity {
        case .walking: return "Caminar"
        case .running: return "Correr"
        case .hiking: return "Senderismo"
        case .cycling: return "Bici"
        case .swimming: return "Natación"
        case .traditionalStrengthTraining, .functionalStrengthTraining: return "Fuerza"
        case .yoga: return "Yoga"
        case .pilates: return "Pilates"
        case .elliptical: return "Elíptica"
        case .rowing: return "Remo"
        case .stairClimbing: return "Escaleras"
        case .dance, .socialDance: return "Baile"
        case .highIntensityIntervalTraining: return "HIIT"
        case .tennis: return "Tenis"
        case .soccer: return "Fútbol"
        case .basketball: return "Baloncesto"
        case .golf: return "Golf"
        case .cooldown, .flexibility: return "Estiramientos"
        default: return "Ejercicio"
        }
    }
}
