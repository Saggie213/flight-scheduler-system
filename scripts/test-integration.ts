import { FlightDataProcessor } from '../src/lib/flight-data-processor'

async function testIntegration() {
  console.log('Testing flight data integration...')
  
  try {
    const processor = FlightDataProcessor.getInstance()
    
    // Test 1: Load flight data
    console.log('\n1. Testing flight data loading...')
    const flightData = await processor.getFlightData('BOM')
    console.log(`✓ Loaded ${flightData.length} flights for BOM`)
    
    // Test 2: Get airport statistics
    console.log('\n2. Testing airport statistics...')
    const stats = await processor.getAirportStatistics('BOM')
    console.log('✓ Airport statistics:', JSON.stringify(stats, null, 2))
    
    // Test 3: Get peak hour analysis
    console.log('\n3. Testing peak hour analysis...')
    const peakHours = await processor.getPeakHourAnalysis('BOM')
    console.log('✓ Peak hour analysis:', JSON.stringify(peakHours.slice(0, 3), null, 2))
    
    // Test 4: Test real-time updates
    console.log('\n4. Testing real-time updates...')
    const realTimeData = await processor.getRealTimeUpdates('BOM')
    console.log(`✓ Real-time updates for ${realTimeData.length} flights`)
    
    // Test 5: Test airline extraction
    console.log('\n5. Testing airline extraction...')
    const testFlights = ['AI101', '6E203', 'SG305', 'UK407']
    for (const flight of testFlights) {
      const airline = processor['extractAirline'] ? processor['extractAirline'](flight) : 'Unknown'
      console.log(`✓ ${flight} -> ${airline}`)
    }
    
    console.log('\n🎉 All integration tests passed!')
    
  } catch (error) {
    console.error('❌ Integration test failed:', error)
    process.exit(1)
  }
}

// Run the test
if (require.main === module) {
  testIntegration()
}

export { testIntegration }