import { Server } from 'socket.io'
import { db } from '@/lib/db'

interface FlightUpdate {
  flightId: string
  status: string
  delayMinutes?: number
  gate?: string
  terminal?: string
  timestamp: string
}

interface OptimizationUpdate {
  optimizationId: string
  status: string
  progress: number
  message: string
  timestamp: string
}

interface AnalyticsUpdate {
  airportCode: string
  type: string
  data: any
  timestamp: string
}

export const setupSocket = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Join airport-specific room
    socket.on('join-airport', (airportCode: string) => {
      socket.join(`airport-${airportCode}`)
      console.log(`Client ${socket.id} joined airport ${airportCode}`)
    })

    // Leave airport room
    socket.on('leave-airport', (airportCode: string) => {
      socket.leave(`airport-${airportCode}`)
      console.log(`Client ${socket.id} left airport ${airportCode}`)
    })

    // Request real-time flight updates
    socket.on('request-flight-updates', (airportCode: string) => {
      socket.join(`flight-updates-${airportCode}`)
      
      // Simulate real-time flight updates
      const interval = setInterval(async () => {
        try {
          // Get latest flight data for the airport
          const flights = await db.flight.findMany({
            where: { airportCode },
            orderBy: { updatedAt: 'desc' },
            take: 10
          })

          // Emit flight updates
          socket.emit('flight-update', {
            airportCode,
            flights,
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          console.error('Error fetching flight updates:', error)
        }
      }, 5000) // Update every 5 seconds

      socket.on('disconnect', () => {
        clearInterval(interval)
      })
    })

    // Request optimization updates
    socket.on('request-optimization-updates', (airportCode: string) => {
      socket.join(`optimization-updates-${airportCode}`)
      
      const interval = setInterval(async () => {
        try {
          // Get latest optimization status
          const optimizations = await db.optimization.findMany({
            where: { 
              airportCode,
              status: { in: ['PENDING', 'IN_PROGRESS'] }
            },
            orderBy: { updatedAt: 'desc' },
            take: 5
          })

          // Emit optimization updates
          socket.emit('optimization-update', {
            airportCode,
            optimizations,
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          console.error('Error fetching optimization updates:', error)
        }
      }, 3000) // Update every 3 seconds

      socket.on('disconnect', () => {
        clearInterval(interval)
      })
    })

    // Request analytics updates
    socket.on('request-analytics-updates', (airportCode: string) => {
      socket.join(`analytics-updates-${airportCode}`)
      
      const interval = setInterval(async () => {
        try {
          // Get latest analytics data
          const analytics = await db.analytics.findMany({
            where: { airportCode },
            orderBy: { timestamp: 'desc' },
            take: 5
          })

          // Emit analytics updates
          socket.emit('analytics-update', {
            airportCode,
            analytics,
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          console.error('Error fetching analytics updates:', error)
        }
      }, 10000) // Update every 10 seconds

      socket.on('disconnect', () => {
        clearInterval(interval)
      })
    })

    // Handle flight status updates
    socket.on('update-flight-status', async (update: FlightUpdate) => {
      try {
        await db.flight.update({
          where: { id: update.flightId },
          data: {
            status: update.status as any,
            delayMinutes: update.delayMinutes,
            gate: update.gate,
            terminal: update.terminal,
            updatedAt: new Date()
          }
        })

        // Broadcast update to all clients in the airport room
        io.to(`airport-${update.flightId.substring(0, 3)}`).emit('flight-status-changed', update)
        
        console.log('Flight status updated:', update)
      } catch (error) {
        console.error('Error updating flight status:', error)
        socket.emit('error', { message: 'Failed to update flight status' })
      }
    })

    // Handle optimization progress updates
    socket.on('update-optimization-progress', async (update: OptimizationUpdate) => {
      try {
        await db.optimization.update({
          where: { id: update.optimizationId },
          data: {
            status: update.status as any,
            updatedAt: new Date()
          }
        })

        // Broadcast update to all clients
        io.emit('optimization-progress-changed', update)
        
        console.log('Optimization progress updated:', update)
      } catch (error) {
        console.error('Error updating optimization progress:', error)
        socket.emit('error', { message: 'Failed to update optimization progress' })
      }
    })

    // Handle custom analytics events
    socket.on('analytics-event', async (event: AnalyticsUpdate) => {
      try {
        // Store analytics event
        await db.analytics.create({
          data: {
            airportCode: event.airportCode,
            type: event.type as any,
            data: JSON.stringify(event.data),
            confidence: 0.9,
            timestamp: new Date()
          }
        })

        // Broadcast to analytics room
        io.to(`analytics-updates-${event.airportCode}`).emit('analytics-event', event)
        
        console.log('Analytics event:', event)
      } catch (error) {
        console.error('Error handling analytics event:', error)
        socket.emit('error', { message: 'Failed to process analytics event' })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Flight Scheduling Analytics System',
      timestamp: new Date().toISOString()
    })
  })

  // Server-side events for broadcasting
  return {
    // Broadcast flight delay alert
    broadcastDelayAlert: (airportCode: string, alert: any) => {
      io.to(`airport-${airportCode}`).emit('delay-alert', alert)
    },

    // Broadcast optimization completion
    broadcastOptimizationComplete: (airportCode: string, result: any) => {
      io.to(`optimization-updates-${airportCode}`).emit('optimization-complete', result)
    },

    // Broadcast capacity warning
    broadcastCapacityWarning: (airportCode: string, warning: any) => {
      io.to(`airport-${airportCode}`).emit('capacity-warning', warning)
    },

    // Broadcast system status
    broadcastSystemStatus: (status: any) => {
      io.emit('system-status', status)
    }
  }
}