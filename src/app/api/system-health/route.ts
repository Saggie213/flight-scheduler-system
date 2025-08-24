import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface HealthResponse {
  success: boolean
  data?: {
    status: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: string
    uptime: number
    version: string
    components: {
      database: {
        status: 'healthy' | 'unhealthy'
        responseTime: number
        lastChecked: string
      }
      apis: {
        status: 'healthy' | 'degraded' | 'unhealthy'
        endpoints: string[]
        responseTime: number
      }
      websocket: {
        status: 'healthy' | 'unhealthy'
        connections: number
        lastActivity: string
      }
      aiServices: {
        status: 'healthy' | 'degraded' | 'unhealthy'
        responseTime: number
        lastUsed: string
      }
    }
    metrics: {
      totalRequests: number
      errorRate: number
      averageResponseTime: number
      activeConnections: number
    }
    alerts: {
      level: 'info' | 'warning' | 'error' | 'critical'
      message: string
      timestamp: string
    }[]
  }
  error?: string
}

// In-memory metrics storage (in production, use Redis or similar)
const systemMetrics = {
  totalRequests: 0,
  errorCount: 0,
  responseTimes: [] as number[],
  startTime: Date.now(),
  lastHealthCheck: Date.now()
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Check database health
    const databaseHealth = await checkDatabaseHealth()
    
    // Check API endpoints health
    const apiHealth = await checkAPIHealth()
    
    // Check WebSocket health
    const websocketHealth = await checkWebSocketHealth()
    
    // Check AI services health
    const aiHealth = await checkAIServicesHealth()
    
    // Calculate overall system health
    const overallStatus = determineOverallStatus(databaseHealth, apiHealth, websocketHealth, aiHealth)
    
    // Update metrics
    systemMetrics.totalRequests++
    const responseTime = Date.now() - startTime
    systemMetrics.responseTimes.push(responseTime)
    
    // Keep only last 100 response times
    if (systemMetrics.responseTimes.length > 100) {
      systemMetrics.responseTimes = systemMetrics.responseTimes.slice(-100)
    }
    
    const averageResponseTime = systemMetrics.responseTimes.reduce((a, b) => a + b, 0) / systemMetrics.responseTimes.length
    const errorRate = systemMetrics.errorCount / systemMetrics.totalRequests
    
    // Generate alerts based on component status
    const alerts = generateAlerts(databaseHealth, apiHealth, websocketHealth, aiHealth)
    
    const healthData: HealthResponse['data'] = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - systemMetrics.startTime,
      version: '1.0.0',
      components: {
        database: databaseHealth,
        apis: apiHealth,
        websocket: websocketHealth,
        aiServices: aiHealth
      },
      metrics: {
        totalRequests: systemMetrics.totalRequests,
        errorRate: errorRate,
        averageResponseTime: averageResponseTime,
        activeConnections: websocketHealth.connections
      },
      alerts
    }
    
    systemMetrics.lastHealthCheck = Date.now()
    
    return NextResponse.json<HealthResponse>({
      success: true,
      data: healthData
    })

  } catch (error) {
    console.error('Health check error:', error)
    systemMetrics.errorCount++
    
    return NextResponse.json<HealthResponse>(
      { 
        success: false, 
        error: 'Health check failed',
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: Date.now() - systemMetrics.startTime,
          version: '1.0.0',
          components: {
            database: { status: 'unhealthy', responseTime: 0, lastChecked: new Date().toISOString() },
            apis: { status: 'unhealthy', endpoints: [], responseTime: 0 },
            websocket: { status: 'unhealthy', connections: 0, lastActivity: new Date().toISOString() },
            aiServices: { status: 'unhealthy', responseTime: 0, lastUsed: new Date().toISOString() }
          },
          metrics: {
            totalRequests: systemMetrics.totalRequests,
            errorRate: 1,
            averageResponseTime: 0,
            activeConnections: 0
          },
          alerts: [{
            level: 'critical',
            message: 'System health check failed',
            timestamp: new Date().toISOString()
          }]
        }
      },
      { status: 500 }
    )
  }
}

async function checkDatabaseHealth() {
  const startTime = Date.now()
  
  try {
    // Simple database query to check connectivity
    await db.airport.findFirst({
      select: { id: true },
      take: 1
    })
    
    const responseTime = Date.now() - startTime
    
    return {
      status: 'healthy' as const,
      responseTime,
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    return {
      status: 'unhealthy' as const,
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString()
    }
  }
}

async function checkAPIHealth() {
  const startTime = Date.now()
  const endpoints = ['/api/flight-data', '/api/nlp-query', '/api/optimization', '/api/predictive-analytics']
  const healthyEndpoints: string[] = []
  
  // In a real implementation, you would make actual HTTP requests to these endpoints
  // For now, we'll simulate the checks
  for (const endpoint of endpoints) {
    try {
      // Simulate API check - in production, make actual HTTP requests
      const isHealthy = Math.random() > 0.1 // 90% success rate
      if (isHealthy) {
        healthyEndpoints.push(endpoint)
      }
    } catch (error) {
      console.error(`API health check failed for ${endpoint}:`, error)
    }
  }
  
  const responseTime = Date.now() - startTime
  const status = healthyEndpoints.length === endpoints.length ? 'healthy' : 
                   healthyEndpoints.length > 0 ? 'degraded' : 'unhealthy'
  
  return {
    status,
    endpoints: healthyEndpoints,
    responseTime
  }
}

async function checkWebSocketHealth() {
  try {
    // In a real implementation, you would check active WebSocket connections
    // For now, we'll simulate the check
    const connections = Math.floor(Math.random() * 50) // Simulate 0-50 active connections
    const lastActivity = new Date(Date.now() - Math.random() * 300000).toISOString() // Activity within last 5 minutes
    
    return {
      status: connections > 0 ? 'healthy' : 'unhealthy',
      connections,
      lastActivity
    }
  } catch (error) {
    console.error('WebSocket health check failed:', error)
    return {
      status: 'unhealthy',
      connections: 0,
      lastActivity: new Date().toISOString()
    }
  }
}

async function checkAIServicesHealth() {
  const startTime = Date.now()
  
  try {
    // In a real implementation, you would make a test call to the AI service
    // For now, we'll simulate the check
    const isHealthy = Math.random() > 0.15 // 85% success rate
    const responseTime = Date.now() - startTime
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      responseTime,
      lastUsed: new Date().toISOString()
    }
  } catch (error) {
    console.error('AI services health check failed:', error)
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastUsed: new Date().toISOString()
    }
  }
}

function determineOverallStatus(database: any, api: any, websocket: any, ai: any) {
  const components = [database.status, api.status, websocket.status, ai.status]
  
  if (components.every(status => status === 'healthy')) {
    return 'healthy'
  } else if (components.some(status => status === 'unhealthy')) {
    return 'unhealthy'
  } else {
    return 'degraded'
  }
}

function generateAlerts(database: any, api: any, websocket: any, ai: any) {
  const alerts: HealthResponse['data']['alerts'] = []
  
  if (database.status === 'unhealthy') {
    alerts.push({
      level: 'critical',
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    })
  }
  
  if (api.status === 'unhealthy') {
    alerts.push({
      level: 'error',
      message: 'Multiple API endpoints are unavailable',
      timestamp: new Date().toISOString()
    })
  } else if (api.status === 'degraded') {
    alerts.push({
      level: 'warning',
      message: 'Some API endpoints are degraded',
      timestamp: new Date().toISOString()
    })
  }
  
  if (websocket.status === 'unhealthy') {
    alerts.push({
      level: 'warning',
      message: 'WebSocket service is unavailable',
      timestamp: new Date().toISOString()
    })
  }
  
  if (ai.status === 'unhealthy') {
    alerts.push({
      level: 'error',
      message: 'AI services are unavailable',
      timestamp: new Date().toISOString()
    })
  } else if (ai.status === 'degraded') {
    alerts.push({
      level: 'warning',
      message: 'AI services are experiencing degraded performance',
      timestamp: new Date().toISOString()
    })
  }
  
  // Add performance alerts
  if (database.responseTime > 1000) {
    alerts.push({
      level: 'warning',
      message: 'Database response time is high',
      timestamp: new Date().toISOString()
    })
  }
  
  if (api.responseTime > 2000) {
    alerts.push({
      level: 'warning',
      message: 'API response time is high',
      timestamp: new Date().toISOString()
    })
  }
  
  return alerts
}

// Endpoint to log errors
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { error, component, severity = 'error', context } = body
    
    console.error(`Error logged from ${component}:`, error)
    
    // In production, you would send this to a logging service
    // For now, we'll just update our metrics
    systemMetrics.errorCount++
    
    // Create an alert for critical errors
    if (severity === 'critical') {
      // In production, you would trigger notifications here
      console.error('CRITICAL ERROR:', { component, error, context })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Error logged successfully'
    })
    
  } catch (error) {
    console.error('Error logging failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log error' },
      { status: 500 }
    )
  }
}