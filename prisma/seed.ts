import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.optimization.deleteMany()
  await prisma.flight.deleteMany()
  await prisma.analytics.deleteMany()
  await prisma.airport.deleteMany()

  // Create airports
  const airports = await Promise.all([
    prisma.airport.create({
      data: {
        code: 'BOM',
        name: 'Chhatrapati Shivaji Maharaj International Airport',
        city: 'Mumbai',
        country: 'India',
        timezone: 'Asia/Kolkata',
        coordinates: JSON.stringify({ lat: 19.0896, lng: 72.8656 }),
        terminals: 2,
        runways: 2,
        capacity: 40
      }
    }),
    prisma.airport.create({
      data: {
        code: 'DEL',
        name: 'Indira Gandhi International Airport',
        city: 'New Delhi',
        country: 'India',
        timezone: 'Asia/Kolkata',
        coordinates: JSON.stringify({ lat: 28.5562, lng: 77.1000 }),
        terminals: 3,
        runways: 3,
        capacity: 45
      }
    }),
    prisma.airport.create({
      data: {
        code: 'BLR',
        name: 'Kempegowda International Airport',
        city: 'Bangalore',
        country: 'India',
        timezone: 'Asia/Kolkata',
        coordinates: JSON.stringify({ lat: 13.1986, lng: 77.7066 }),
        terminals: 2,
        runways: 2,
        capacity: 35
      }
    }),
    prisma.airport.create({
      data: {
        code: 'MAA',
        name: 'Chennai International Airport',
        city: 'Chennai',
        country: 'India',
        timezone: 'Asia/Kolkata',
        coordinates: JSON.stringify({ lat: 12.9846, lng: 80.1743 }),
        terminals: 4,
        runways: 2,
        capacity: 30
      }
    }),
    prisma.airport.create({
      data: {
        code: 'HYD',
        name: 'Rajiv Gandhi International Airport',
        city: 'Hyderabad',
        country: 'India',
        timezone: 'Asia/Kolkata',
        coordinates: JSON.stringify({ lat: 17.2403, lng: 78.4294 }),
        terminals: 1,
        runways: 2,
        capacity: 25
      }
    }),
    prisma.airport.create({
      data: {
        code: 'CCU',
        name: 'Netaji Subhas Chandra Bose International Airport',
        city: 'Kolkata',
        country: 'India',
        timezone: 'Asia/Kolkata',
        coordinates: JSON.stringify({ lat: 22.6541, lng: 88.4464 }),
        terminals: 2,
        runways: 2,
        capacity: 28
      }
    })
  ])

  console.log(`Created ${airports.length} airports`)

  // Create some sample flights based on the real data
  const flights = await Promise.all([
    prisma.flight.create({
      data: {
        flightNumber: 'AI101',
        airline: 'Air India',
        origin: 'DEL',
        destination: 'BOM',
        scheduledDeparture: new Date('2025-07-25T08:00:00'),
        scheduledArrival: new Date('2025-07-25T10:30:00'),
        actualDeparture: new Date('2025-07-25T08:15:00'),
        status: 'DEPARTED',
        delayMinutes: 15,
        airportCode: 'BOM'
      }
    }),
    prisma.flight.create({
      data: {
        flightNumber: '6E203',
        airline: 'IndiGo',
        origin: 'BOM',
        destination: 'DEL',
        scheduledDeparture: new Date('2025-07-25T09:15:00'),
        scheduledArrival: new Date('2025-07-25T11:45:00'),
        actualDeparture: new Date('2025-07-25T10:00:00'),
        status: 'DELAYED',
        delayMinutes: 45,
        airportCode: 'BOM'
      }
    }),
    prisma.flight.create({
      data: {
        flightNumber: 'SG305',
        airline: 'SpiceJet',
        origin: 'BLR',
        destination: 'BOM',
        scheduledDeparture: new Date('2025-07-25T10:30:00'),
        scheduledArrival: new Date('2025-07-25T12:00:00'),
        status: 'SCHEDULED',
        airportCode: 'BOM'
      }
    }),
    prisma.flight.create({
      data: {
        flightNumber: 'UK407',
        airline: 'Vistara',
        origin: 'BOM',
        destination: 'MAA',
        scheduledDeparture: new Date('2025-07-25T11:45:00'),
        scheduledArrival: new Date('2025-07-25T14:15:00'),
        status: 'SCHEDULED',
        airportCode: 'BOM'
      }
    }),
    prisma.flight.create({
      data: {
        flightNumber: 'AI509',
        airline: 'Air India',
        origin: 'BOM',
        destination: 'CCU',
        scheduledDeparture: new Date('2025-07-25T13:00:00'),
        scheduledArrival: new Date('2025-07-25T15:30:00'),
        status: 'SCHEDULED',
        airportCode: 'BOM'
      }
    })
  ])

  console.log(`Created ${flights.length} flights`)

  // Create some sample analytics
  const analytics = await Promise.all([
    prisma.analytics.create({
      data: {
        airportCode: 'BOM',
        type: 'PEAK_HOURS',
        data: JSON.stringify({
          peakHours: ['06:00', '14:00', '18:00'],
          peakHourFlights: [12, 18, 15],
          recommendations: ['Redistribute flights from 14:00-16:00', 'Add morning slots']
        }),
        confidence: 0.85
      }
    }),
    prisma.analytics.create({
      data: {
        airportCode: 'BOM',
        type: 'DELAYS',
        data: JSON.stringify({
          totalDelayedFlights: 4,
          averageDelay: 17.8,
          delayDistribution: { minor: 2, major: 1, critical: 1 },
          cascadingRisk: { level: 'medium', affectedFlights: 2 }
        }),
        confidence: 0.92
      }
    })
  ])

  console.log(`Created ${analytics.length} analytics records`)

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })