import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

let adminApp: App | undefined

function getServiceAccount() {
  // 1. Try env vars (Vercel, etc.)
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
  if (projectId && clientEmail && privateKey) {
    privateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim()
    return { projectId, clientEmail, privateKey }
  }
  // 2. Try firebase_sdk.json or firebase_sdk.json in project root
  try {
    const p = path.join(process.cwd(), 'firebase_sdk.json')
    if (fs.existsSync(p)) {
      const sa = JSON.parse(fs.readFileSync(p, 'utf8'))
      return {
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key?.replace(/\\n/g, '\n'),
      }
    }
  } catch (e) {
    console.error('Failed to load firebase_sdk.json:', e)
  }
  return null
}

export function getAdminApp() {
  if (adminApp) return adminApp

  const existing = getApps()
  if (existing.length > 0) {
    adminApp = existing[0] as App
    return adminApp
  }

  try {
    const sa = getServiceAccount()
    if (sa) {
      adminApp = initializeApp({
        credential: cert(sa),
      })
    } else {
      adminApp = initializeApp()
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error)
    throw error
  }

  return adminApp
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp())
}
