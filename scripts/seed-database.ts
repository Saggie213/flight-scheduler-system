import { db } from '../src/lib/db'
import { FlightDataProcessor } from '../src/lib/flight-data-processor'

async function seedDatabase() {
  try {
    console.log('Starting database seeding with real flight data...')
    
    // Initialize flight data processor
    const processor = FlightDataProcessor.getInstance()
    
    // Clear existing data
    console.log('Clearing existing data...')
    await db.flight.deleteMany()
    await db.airport.deleteMany()
    await db.analytics.deleteMany()
    await db.nLPQuery.deleteMany()
    await db.optimization.deleteMany()

    console.log('Creating airports...')
    
    // Create major airports
    const airports = await Promise.all([
      db.airport.create({
        data: {
          code: 'BOM',
          name: 'Chhatrapati Shivaji International Airport',
          city: 'Mumbai',
          country: 'India',
          timezone: 'Asia/Kolkata',
          coordinates: JSON.stringify({ lat: 19.0896, lng: 72.8656 }),
          terminals: 2,
          runways: 2,
          capacity: 950
        }
      }),
      db.airport.create({
        data: {
          code: 'DEL',
          name: 'Indira Gandhi International Airport',
          city: 'Delhi',
          country: 'India',
          timezone: 'Asia/Kolkata',
          coordinates: JSON.stringify({ lat: 28.5562, lng: 77.1000 }),
          terminals: 3,
          runways: 3,
          capacity: 1200
        }
      }),
      db.airport.create({
        data: {
          code: 'BLR',
          name: 'Kempegowda International Airport',
          city: 'Bangalore',
          country: 'India',
          timezone: 'Asia/Kolkata',
          coordinates: JSON.stringify({ lat: 13.1989, lng: 77.7065 }),
          terminals: 2,
          runways: 1,
          capacity: 800
        }
      }),
      db.airport.create({
        data: {
          code: 'HYD',
          name: 'Rajiv Gandhi International Airport',
          city: 'Hyderabad',
          country: 'India',
          timezone: 'Asia/Kolkata',
          coordinates: JSON.stringify({ lat: 17.2403, lng: 78.4294 }),
          terminals: 1,
          runways: 1,
          capacity: 600
        }
      }),
      db.airport.create({
        data: {
          code: 'MAA',
          name: 'Chennai International Airport',
          city: 'Chennai',
          country: 'India',
          timezone: 'Asia/Kolkata',
          coordinates: JSON.stringify({ lat: 12.9944, lng: 80.1709 }),
          terminals: 4,
          runways: 2,
          capacity: 700
        }
      })
    ])

    console.log(`Created ${airports.length} airports`)

    console.log('Loading flight data...')
    
    // Get flight data for each airport
    const airportCodes = ['BOM', 'DEL', 'BLR']
    let totalFlights = 0

    for (const airportCode of airportCodes) {
      console.log(`Processing flights for ${airportCode}...`)
      
      try {
        const flightData = await processor.getFlightData(airportCode)
        
        // Create flights for this airport
        for (const flight of flightData) {
          await db.flight.create({
            data: {
              flightNumber: flight.flightNumber,
              airline: extractAirline(flight.flightNumber),
              origin: flight.origin,
              destination: flight.destination,
              scheduledDeparture: flight.scheduledDeparture,
              scheduledArrival: flight.scheduledArrival,
              actualDeparture: flight.actualDeparture,
              actualArrival: flight.actualArrival,
              status: flight.status as any,
              delayMinutes: flight.delayMinutes,
              aircraft: flight.aircraft,
              airportCode: flight.airportCode,
              gate: generateRandomGate(),
              terminal: generateRandomTerminal()
            }
          })
        }
        
        totalFlights += flightData.length
        console.log(`Created ${flightData.length} flights for ${airportCode}`)
        
        // Create analytics for this airport
        const stats = await processor.getAirportStatistics(airportCode)
        const peakHourData = await processor.getPeakHourAnalysis(airportCode)
        
        await db.analytics.create({
          data: {
            airportCode,
            type: 'PEAK_HOURS',
            data: JSON.stringify(peakHourData),
            confidence: 0.95
          }
        })
        
        await db.analytics.create({
          data: {
            airportCode,
            type: 'DELAYS',
            data: JSON.stringify(stats),
            confidence: 0.90
          }
        })
        
        await db.analytics.create({
          data: {
            airportCode,
            type: 'CAPACITY',
            data: JSON.stringify({
              currentUtilization: stats.capacityUtilization,
              maxSustainableCapacity: 95,
              bottlenecks: ['Runway capacity', 'Gate availability'],
              recommendations: ['Optimize scheduling', 'Improve efficiency']
            }),
            confidence: 0.85
          }
        })
        
        console.log(`Created analytics for ${airportCode}`)
        
      } catch (error) {
        console.error(`Error processing ${airportCode}:`, error)
      }
    }

    console.log(`Database seeding completed successfully!`)
    console.log(`Summary:`)
    console.log(`- Airports: ${airports.length}`)
    console.log(`- Total Flights: ${totalFlights}`)
    console.log(`- Analytics records: ${airports.length * 3}`)
    
  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  }
}

function extractAirline(flightNumber: string): string {
  const airlineCodes: Record<string, string> = {
    'AI': 'Air India',
    '6E': 'IndiGo',
    'SG': 'SpiceJet',
    'UK': 'Vistara',
    'G8': 'GoAir',
    'IX': 'Air India Express',
    'QP': 'Akasa Air',
    'WY': 'Oman Air',
    'B7': 'Boeing', // For flight numbers starting with B7
    'A2': 'Air Asia',
    'A3': 'Air Asia',
    'A4': 'Air Arabia',
    'A9': 'Air Arabia',
    'VT': 'Various' // For registration prefixes
  }

  const code = flightNumber.substring(0, 2).toUpperCase()
  return airlineCodes[code] || 'Unknown Airline'
}

function generateRandomGate(): string {
  const terminals = ['A', 'B', 'C', 'D']
  const terminal = terminals[Math.floor(Math.random() * terminals.length)]
  const number = Math.floor(Math.random() * 50) + 1
  return `${terminal}${number}`
}

function generateRandomTerminal(): string {
  const terminals = ['T1', 'T2', 'T3', 'T4']
  return terminals[Math.floor(Math.random() * terminals.length)]
}

// Run the seeding
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Database seeding completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Database seeding failed:', error)
      process.exit(1)
    })
}

export { seedDatabase }