import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const uri = process.env.MONGODB_URI

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})

async function connect () {
  try {
    await client.connect()
    const database = client.db('tasks_db')
    return database.collection('tasks')
  } catch (error) {
    console.error('Error connecting to the database')
    console.error(error)
    await client.close()
  }
}

export class taskModel {
  static async getAll ({ status, title }) {
    const db = await connect()
    const query = {}

    if (status) {
      query.status = {
        $regex: status,
        $options: 'i'
      }
    }

    if (title) {
      query.title = {
        $regex: title,
        $options: 'i'
      }
    }

    // Consulta para obtener todos los documentos
    const tasks = await db.find(query).toArray()

    // Ordenar manualmente por estado y fecha
    return tasks.sort((a, b) => {
      // Verificar si alguno es "Pendiente"
      const aIsPendiente = /^pendiente$/i.test(a.status)
      const bIsPendiente = /^pendiente$/i.test(b.status)

      // Si uno es pendiente y el otro no, el pendiente va primero
      if (aIsPendiente && !bIsPendiente) return -1
      if (!aIsPendiente && bIsPendiente) return 1

      // Si ambos tienen el mismo estado (ambos pendientes o ambos no pendientes)
      // ordenar por fecha descendente (más reciente primero)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }

  static async getById ({ id }) {
    const db = await connect()
    const objectId = new ObjectId(id)
    return db.findOne({ _id: objectId })
  }

  static async createTask ({ input }) {
    const db = await connect()

    // Crear la fecha con la zona horaria de CDMX (UTC-6)
    const mexicoCityDate = new Date()
    // Ajustar a la zona horaria de la Ciudad de México (UTC-6)
    mexicoCityDate.setUTCHours(mexicoCityDate.getUTCHours() - 6)

    // Agregar el campo createdAt al objeto input
    const taskWithCreatedAt = {
      ...input,
      createdAt: mexicoCityDate
    }

    const { insertedId } = await db.insertOne(taskWithCreatedAt)

    return {
      id: insertedId,
      ...taskWithCreatedAt
    }
  }

  static async updateTask ({ id, input }) {
    const db = await connect()
    const objectId = new ObjectId(id)

    const result = await db.findOneAndUpdate(
      { _id: objectId },
      { $set: input },
      { returnDocument: 'after' }
    )

    if (!result) return false

    return result
  }

  static async deleteTask ({ id }) {
    const db = await connect()
    const objectId = new ObjectId(id)
    const { deletedCount } = await db.deleteOne({ _id: objectId })
    return deletedCount > 0
  }
}
