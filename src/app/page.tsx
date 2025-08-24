'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plane, Clock, TrendingUp, AlertTriangle, Search, BarChart3, Calendar, MapPin } from 'lucide-react'

interface FlightData {
  id: string
  flightNumber: string
  origin: string
  destination: string
  scheduledDeparture: string
  scheduledArrival: string
  actualDeparture?: string
  actualArrival?: string
  status: 'scheduled' | 'delayed' | 'departed' | 'arrived' | 'cancelled'
  delayMinutes?: number
}

interface AirportStats {
  code: string
  name: string
  totalFlights: number
  delayedFlights: number
  avgDelay: number
  peakHour: string
  capacityUtilization: number
}

// Mock data for fallback
const mockFlightData: FlightData[] = [
  { id: '1', flightNumber: 'AI101', origin: 'DEL', destination: 'BOM', scheduledDeparture: '08:00', scheduledArrival: '10:30', status: 'departed', delayMinutes: 15 },
  { id: '2', flightNumber: '6E203', origin: 'BOM', destination: 'DEL', scheduledDeparture: '09:15', scheduledArrival: '11:45', status: 'delayed', delayMinutes: 45 },
  { id: '3', flightNumber: 'SG305', origin: 'BLR', destination: 'BOM', scheduledDeparture: '10:30', scheduledArrival: '12:00', status: 'scheduled' },
  { id: '4', flightNumber: 'UK407', origin: 'BOM', destination: 'MAA', scheduledDeparture: '11:45', scheduledArrival: '14:15', status: 'scheduled' },
  { id: '5', flightNumber: 'AI509', origin: 'BOM', destination: 'CCU', scheduledDeparture: '13:00', scheduledArrival: '15:30', status: 'scheduled' },
  { id: '6', flightNumber: '6E611', origin: 'HYD', destination: 'BOM', scheduledDeparture: '14:15', scheduledArrival: '16:45', status: 'scheduled' },
  { id: '7', flightNumber: 'SG713', origin: 'BOM', destination: 'PNQ', scheduledDeparture: '15:30', scheduledArrival: '16:30', status: 'scheduled' },
  { id: '8', flightNumber: 'UK815', origin: 'BOM', destination: 'GOI', scheduledDeparture: '16:45', scheduledArrival: '18:15', status: 'scheduled' },
]

const mockAirportStats: AirportStats[] = [
  { code: 'BOM', name: 'Mumbai', totalFlights: 156, delayedFlights: 23, avgDelay: 28, peakHour: '14:00', capacityUtilization: 87 },
  { code: 'DEL', name: 'Delhi', totalFlights: 142, delayedFlights: 19, avgDelay: 25, peakHour: '13:00', capacityUtilization: 82 },
  { code: 'BLR', name: 'Bangalore', totalFlights: 98, delayedFlights: 12, avgDelay: 22, peakHour: '12:00', capacityUtilization: 75 },
  { code: 'MAA', name: 'Chennai', totalFlights: 87, delayedFlights: 9, avgDelay: 18, peakHour: '11:00', capacityUtilization: 68 },
]

export default function FlightSchedulingDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAirport, setSelectedAirport] = useState('BOM')
  const [flightData, setFlightData] = useState<FlightData[]>(mockFlightData)
  const [airportStats, setAirportStats] = useState<AirportStats[]>(mockAirportStats)
  const [loading, setLoading] = useState(false)
  const [nlpQuery, setNlpQuery] = useState('')

  // Initialize with mock data first, then try to load real data
  useEffect(() => {
    // Start with mock data immediately
    setFlightData(mockFlightData)
    setAirportStats(mockAirportStats)
    setLoading(false)
    
    // Then try to load real data
    const loadRealFlightData = async () => {
      try {
        const response = await fetch('/api/flight-tracking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            airportCode: selectedAirport,
            dataSource: 'combined',
            includeRealTime: true,
          }),
        })

        const result = await response.json()
        console.log('Flight tracking result:', result)
        
        if (result.success && result.data && result.data.flights) {
          // Transform API data to frontend format
          const transformedFlights: FlightData[] = result.data.flights.map((flight: any) => ({
            id: flight.id,
            flightNumber: flight.flightNumber,
            origin: flight.origin,
            destination: flight.destination,
            scheduledDeparture: flight.scheduledDeparture,
            scheduledArrival: flight.scheduledArrival,
            actualDeparture: flight.actualDeparture,
            actualArrival: flight.actualArrival,
            status: flight.status,
            delayMinutes: flight.delayMinutes
          }))

          console.log('Transformed flights:', transformedFlights)
          
          // Get airport stats directly from the flight data
          const totalFlights = transformedFlights.length
          const delayedFlights = transformedFlights.filter(f => f.delayMinutes && f.delayMinutes > 0).length
          const avgDelay = totalFlights > 0 ? transformedFlights.reduce((sum, f) => sum + (f.delayMinutes || 0), 0) / totalFlights : 0
          
          const transformedStats: AirportStats[] = [{
            code: selectedAirport,
            name: result.data.airportInfo.name,
            totalFlights: totalFlights,
            delayedFlights: delayedFlights,
            avgDelay: Math.round(avgDelay * 10) / 10,
            peakHour: '06:00', // Based on our data showing peak at 6AM
            capacityUtilization: totalFlights > 0 ? Math.round((totalFlights / 40) * 100) : 0 // Assuming 40 as max capacity
          }]
          
          console.log('Transformed stats:', transformedStats)
          
          // Update with real data
          setFlightData(transformedFlights)
          setAirportStats(transformedStats)
        }
      } catch (error) {
        console.error('Error loading real flight data:', error)
        // Keep using mock data
      }
    }

    loadRealFlightData()
  }, [selectedAirport])

  const handleNLPQuery = async () => {
    if (!nlpQuery.trim()) return
    
    try {
      const response = await fetch('/api/nlp-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: nlpQuery,
          airportCode: selectedAirport,
          saveToDatabase: true,
        }),
      })

      const result = await response.json()
      if (result.success) {
        console.log('NLP Query Result:', result.data)
        
        // Display detailed results
        const { intent, response: queryResponse, recommendations, confidence, queryId } = result.data
        
        let resultMessage = `✅ Query Processed Successfully!\n\n`
        resultMessage += `Intent: ${intent}\n`
        resultMessage += `Confidence: ${Math.round(confidence * 100)}%\n`
        resultMessage += `Query ID: ${queryId}\n\n`
        resultMessage += `Analysis:\n${queryResponse}\n\n`
        
        if (recommendations && recommendations.length > 0) {
          resultMessage += `Recommendations:\n${recommendations.map((rec: string) => `• ${rec}`).join('\n')}`
        }
        
        alert(resultMessage)
        
        // Clear query after successful processing
        setNlpQuery('')
      } else {
        alert(`❌ Query Error: ${result.error}`)
      }
    } catch (error) {
      console.error('NLP Query Error:', error)
      alert('❌ Failed to process query')
    }
  }

  const analyzeFlightData = async (analysisType: 'peak-hours' | 'delays' | 'capacity' | 'patterns') => {
    try {
      const response = await fetch('/api/flight-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          airportCode: selectedAirport,
          analysisType: analysisType,
        }),
      })

      const result = await response.json()
      if (result.success) {
        console.log(`${analysisType} Analysis Result:`, result.data)
        return result.data
      } else {
        console.error(`Analysis Error: ${result.error}`)
        return null
      }
    } catch (error) {
      console.error('Analysis Error:', error)
      return null
    }
  }

  const optimizeSchedule = async () => {
    try {
      const response = await fetch('/api/optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          airportCode: selectedAirport,
          optimizationType: 'scheduling',
          flightData: flightData,
          applyOptimization: true,
        }),
      })

      const result = await response.json()
      if (result.success) {
        console.log('Optimization Result:', result.data)
        
        // Update UI with optimization results
        if (result.data.appliedOptimizations) {
          alert(`✅ Optimization Applied Successfully!\n\n${result.data.appliedOptimizations.length} optimizations applied:\n${result.data.appliedOptimizations.map((opt: any) => `• ${opt.action}: ${opt.result}`).join('\n')}`)
        } else {
          alert(`✅ Optimization Complete!\n\nGenerated ${result.data.recommendations.length} recommendations:\n${result.data.recommendations.map((rec: any) => `• ${rec.title}: ${rec.impact}`).join('\n')}`)
        }
        
        // Refresh flight data to show changes
        fetchFlightTrackingData()
      } else {
        alert(`❌ Optimization Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Optimization Error:', error)
      alert('❌ Failed to optimize schedule')
    }
  }

  const fetchFlightTrackingData = async () => {
    try {
      const response = await fetch('/api/flight-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          airportCode: selectedAirport,
          dataSource: 'combined',
          includeRealTime: true,
        }),
      })

      const result = await response.json()
      if (result.success) {
        console.log('Flight Tracking Data:', result.data)
        setFlightData(result.data.flights)
        alert(`Fetched ${result.data.flights.length} flights from ${result.data.dataSource}`)
      } else {
        alert(`Flight Tracking Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Flight Tracking Error:', error)
      alert('Failed to fetch flight tracking data')
    }
  }

  const runPredictiveAnalytics = async (analysisType: 'delay-propagation' | 'capacity-forecast' | 'disruption-impact' | 'optimization-potential') => {
    try {
      const response = await fetch('/api/predictive-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          airportCode: selectedAirport,
          analysisType: analysisType,
          timeHorizon: 'short-term',
          flightData: flightData,
        }),
      })

      const result = await response.json()
      if (result.success) {
        console.log('Predictive Analytics Result:', result.data)
        
        const { predictions, confidence, riskFactors, recommendations } = result.data
        
        let resultMessage = `✅ Predictive Analysis Complete!\n\n`
        resultMessage += `Analysis Type: ${analysisType}\n`
        resultMessage += `Confidence: ${Math.round(confidence * 100)}%\n\n`
        
        if (predictions && predictions.length > 0) {
          resultMessage += `Predictions:\n${predictions.map((pred: any) => `• ${pred.description} (${pred.probability} probability)`).join('\n')}\n\n`
        }
        
        if (riskFactors && riskFactors.length > 0) {
          resultMessage += `Risk Factors:\n${riskFactors.map((risk: any) => `• ${risk.factor} (${risk.severity} severity)`).join('\n')}\n\n`
        }
        
        if (recommendations && recommendations.length > 0) {
          resultMessage += `Recommendations:\n${recommendations.map((rec: string) => `• ${rec}`).join('\n')}`
        }
        
        alert(resultMessage)
      } else {
        alert(`❌ Predictive Analytics Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Predictive Analytics Error:', error)
      alert('❌ Failed to run predictive analytics')
    }
  }

  // Add WebSocket connection for real-time updates
  useEffect(() => {
    // Initialize WebSocket connection
    const socket = new WebSocket('ws://localhost:3000/api/socketio')
    
    socket.onopen = () => {
      console.log('WebSocket connected')
      // Join airport room for real-time updates
      socket.send(JSON.stringify({
        type: 'join-airport',
        airportCode: selectedAirport
      }))
      
      // Request flight updates
      socket.send(JSON.stringify({
        type: 'request-flight-updates',
        airportCode: selectedAirport
      }))
      
      // Request optimization updates
      socket.send(JSON.stringify({
        type: 'request-optimization-updates',
        airportCode: selectedAirport
      }))
    }
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'flight-update':
          console.log('Real-time flight update:', data)
          // Update flight data in state
          if (data.flights) {
            setFlightData(data.flights)
          }
          break
          
        case 'optimization-update':
          console.log('Optimization update:', data)
          // Handle optimization progress updates
          break
          
        case 'analytics-update':
          console.log('Analytics update:', data)
          // Handle analytics updates
          break
          
        case 'delay-alert':
          console.log('Delay alert:', data)
          alert(`⚠️ Delay Alert: ${data.message}`)
          break
          
        case 'capacity-warning':
          console.log('Capacity warning:', data)
          alert(`⚠️ Capacity Warning: ${data.message}`)
          break
          
        case 'connected':
          console.log('Connected to real-time system')
          break
          
        default:
          console.log('Unknown message type:', data.type)
      }
    }
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    socket.onclose = () => {
      console.log('WebSocket disconnected')
    }
    
    // Cleanup on unmount
    return () => {
      socket.close()
    }
  }, [selectedAirport])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'delayed': return 'bg-red-100 text-red-800'
      case 'departed': return 'bg-green-100 text-green-800'
      case 'arrived': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const currentAirport = airportStats.find(stat => stat.code === selectedAirport)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Plane className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Flight Scheduling Analytics</h1>
                <p className="text-gray-600">AI-powered airport capacity optimization and delay management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="px-3 py-1">
                <MapPin className="h-3 w-3 mr-1" />
                {selectedAirport}
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                Real-time Data
              </Badge>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Flights</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentAirport?.totalFlights || 0}</div>
              <p className="text-xs text-muted-foreground">Today's operations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delayed Flights</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{currentAirport?.delayedFlights || 0}</div>
              <p className="text-xs text-muted-foreground">
                {((currentAirport?.delayedFlights || 0) / (currentAirport?.totalFlights || 1) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Delay</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentAirport?.avgDelay || 0} min</div>
              <p className="text-xs text-muted-foreground">Across all flights</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Capacity Utilization</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentAirport?.capacityUtilization || 0}%</div>
              <Progress value={currentAirport?.capacityUtilization || 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="flights">Flight Schedule</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Peak Hour Analysis</CardTitle>
                  <CardDescription>Busiest times at {selectedAirport} airport</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Peak Hour</span>
                      <Badge variant="secondary">{currentAirport?.peakHour || 'N/A'}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Morning (6AM-12PM)</span>
                        <span>35%</span>
                      </div>
                      <Progress value={35} />
                      <div className="flex justify-between text-sm">
                        <span>Afternoon (12PM-6PM)</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} />
                      <div className="flex justify-between text-sm">
                        <span>Evening (6PM-12AM)</span>
                        <span>20%</span>
                      </div>
                      <Progress value={20} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delay Impact Analysis</CardTitle>
                  <CardDescription>Cascading delay effects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        High risk of cascading delays during peak hours. Current delay propagation rate: 2.3x
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Minor Delays (&lt;15min)</span>
                        <span>12 flights</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Major Delays (&gt;30min)</span>
                        <span>8 flights</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Critical Delays (&gt;60min)</span>
                        <span>3 flights</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="flights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Flight Schedule</CardTitle>
                <CardDescription>Real-time flight information for {selectedAirport}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Search flights..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={fetchFlightTrackingData}>
                      Refresh Data
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {flightData.map((flight) => (
                      <div key={flight.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="text-center">
                            <div className="text-sm font-medium">{flight.flightNumber}</div>
                            <div className="text-xs text-gray-500">{flight.origin} → {flight.destination}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">{flight.scheduledDeparture} - {flight.scheduledArrival}</div>
                          <Badge className={getStatusColor(flight.status)}>
                            {flight.status}
                          </Badge>
                          {flight.delayMinutes && (
                            <div className="text-xs text-red-600 mt-1">
                              +{flight.delayMinutes}min
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>NLP Query Interface</CardTitle>
                <CardDescription>Ask questions about flight data using natural language</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="e.g., 'Show me flights delayed by more than 30 minutes' or 'What is the busiest time at BOM?'"
                      value={nlpQuery}
                      onChange={(e) => setNlpQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleNLPQuery}>
                      <Search className="h-4 w-4 mr-2" />
                      Query
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Sample Queries</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                          "Which flights are delayed today?"
                        </div>
                        <div className="text-sm p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                          "What is the average delay time?"
                        </div>
                        <div className="text-sm p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                          "Show me peak hour flights"
                        </div>
                        <div className="text-sm p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                          "Analyze delay patterns"
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Predictive Analytics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-sm"
                          onClick={() => runPredictiveAnalytics('delay-propagation')}
                        >
                          Analyze Delay Propagation
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-sm"
                          onClick={() => runPredictiveAnalytics('capacity-forecast')}
                        >
                          Capacity Forecast
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-sm"
                          onClick={() => runPredictiveAnalytics('disruption-impact')}
                        >
                          Disruption Impact Analysis
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-sm"
                          onClick={() => runPredictiveAnalytics('optimization-potential')}
                        >
                          Optimization Potential
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Scheduling Optimization</CardTitle>
                  <CardDescription>AI-powered flight scheduling recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <Calendar className="h-4 w-4" />
                      <AlertDescription>
                        Optimization algorithm suggests rescheduling 4 flights to reduce peak hour congestion by 23%.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Recommendations:</h4>
                      <div className="text-sm space-y-1">
                        <div>• Move 6E203 to 10:00 (reduces delay risk)</div>
                        <div>• Reschedule SG305 to 11:00 (better slot utilization)</div>
                        <div>• Optimize UK407 departure time</div>
                        <div>• Adjust AI509 for better flow</div>
                      </div>
                    </div>
                    
                    <Button className="w-full" onClick={optimizeSchedule}>Apply Optimization</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delay Mitigation</CardTitle>
                  <CardDescription>Strategies to reduce cascading delays</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Current Risk Factors:</h4>
                      <div className="text-sm space-y-1">
                        <div>• Weather conditions: Moderate risk</div>
                        <div>• Air traffic control: Normal</div>
                        <div>• Ground operations: Optimal</div>
                        <div>• Crew availability: Sufficient</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Mitigation Actions:</h4>
                      <div className="text-sm space-y-1">
                        <div>• Pre-departure hold for 2 flights</div>
                        <div>• Increase taxiway buffer time</div>
                        <div>• Optimize gate assignments</div>
                        <div>• Prepare contingency plans</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}