import express from 'express'
import multer from 'multer'
import cors from 'cors'
import fetch from 'node-fetch'
import FormData from 'form-data'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())
app.use(express.json())

const TRIPO_API_KEY = process.env.TRIPO_API_KEY?.trim()
const TRIPO_API_URL = 'https://api.tripo3d.ai/v2/openapi'

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasApiKey: !!TRIPO_API_KEY })
})

// Generate 3D model from image
app.post('/api/generate-3d', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' })
    }

    if (!TRIPO_API_KEY) {
      // Demo mode - return a sample model URL for testing
      console.log('No API key - running in demo mode')
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Return a sample GLB model URL (free sample model)
      return res.json({
        success: true,
        modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
        message: 'Demo mode - using sample model'
      })
    }

    const prompt = req.body.prompt || ''

    // Step 1: Upload image to get file token
    console.log('Uploading image to Tripo API...')
    
    const formData = new FormData()
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname || 'image.jpg',
      contentType: req.file.mimetype || 'image/jpeg'
    })

    const uploadResponse = await fetch(`${TRIPO_API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRIPO_API_KEY}`
      },
      body: formData
    })

    const uploadData = await uploadResponse.json()
    console.log('Upload response:', JSON.stringify(uploadData, null, 2))

    if (!uploadResponse.ok || uploadData.code !== 0) {
      console.error('Upload failed:', uploadData)
      throw new Error(uploadData.message || 'Failed to upload image')
    }

    const imageToken = uploadData.data?.image_token
    if (!imageToken) {
      throw new Error('No image token received from upload')
    }

    console.log('Image uploaded successfully, token:', imageToken)

    // Step 2: Create task for image-to-3D conversion
    console.log('Creating 3D generation task...')
    
    const taskBody = {
      type: 'image_to_model',
      file: {
        type: 'image',
        file_token: imageToken
      }
    }
    
    // Add prompt if provided
    if (prompt) {
      taskBody.prompt = prompt
    }

    console.log('Task request body:', JSON.stringify(taskBody, null, 2))

    const taskResponse = await fetch(`${TRIPO_API_URL}/task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRIPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskBody)
    })

    const taskData = await taskResponse.json()
    console.log('Task response:', JSON.stringify(taskData, null, 2))

    if (!taskResponse.ok || taskData.code !== 0) {
      console.error('Task creation failed:', taskData)
      
      // Handle specific error codes with user-friendly messages
      if (taskData.code === 2010) {
        throw new Error('No Tripo credits remaining. Please purchase more credits at tripo3d.ai or use demo mode.')
      }
      
      throw new Error(taskData.message || 'Failed to create task')
    }

    const taskId = taskData.data?.task_id
    if (!taskId) {
      throw new Error('No task ID received')
    }

    console.log('Task created successfully, ID:', taskId)

    // Step 3: Poll for task completion
    console.log('Waiting for generation to complete...')
    
    let modelUrl = null
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    while (!modelUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      const statusResponse = await fetch(`${TRIPO_API_URL}/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${TRIPO_API_KEY}`
        }
      })

      const statusData = await statusResponse.json()
      console.log(`Poll attempt ${attempts + 1}:`, statusData.data?.status)
      
      if (statusData.data?.status === 'success') {
        modelUrl = statusData.data?.output?.model
        break
      } else if (statusData.data?.status === 'failed') {
        throw new Error('Generation failed: ' + (statusData.data?.message || 'Unknown error'))
      }
      
      attempts++
    }

    if (!modelUrl) {
      throw new Error('Generation timed out')
    }

    console.log('Model generated successfully!')
    res.json({
      success: true,
      modelUrl,
      taskId
    })

  } catch (error) {
    console.error('Generation error:', error)
    res.status(500).json({
      error: error.message || 'Failed to generate 3D model'
    })
  }
})

// Get task status
app.get('/api/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params

    const response = await fetch(`${TRIPO_API_URL}/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${TRIPO_API_KEY}`
      }
    })

    const data = await response.json()
    res.json(data)

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  if (!TRIPO_API_KEY) {
    console.log('⚠️  No TRIPO_API_KEY found - running in demo mode')
  } else {
    console.log('✅ Tripo API key configured')
  }
})
