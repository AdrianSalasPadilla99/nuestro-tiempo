import { useEffect, useRef, useState } from 'react'
import './App.css'

const DB_NAME = 'love-counter-db'
const STORE = 'photos'

const loveSettings = {
  nameOne: 'Adrian',
  nameTwo: 'Vale',
  startDate: '2026-11-14T23:55',
  message: 'Mis dos neuronas y corazón son solo para ti',
}

const SUPABASE_URL = 'https://gjnrogvqqtmlphikqdwu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_wJ5X-h9n6faegkzpxkN2Sw_H6gvALfb'
const SUPABASE_PHOTOS_BUCKET = 'photos'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getPhotos() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt))
    request.onerror = () => reject(request.error)
  })
}

async function savePhoto(photo) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(photo)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function deletePhoto(id) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function differenceBetween(start, end) {
  if (end < start) return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  let cursor = new Date(start)
  let years = end.getFullYear() - cursor.getFullYear()
  cursor = new Date(cursor.setFullYear(cursor.getFullYear() + years))
  if (cursor > end) { years--; cursor = new Date(start); cursor.setFullYear(cursor.getFullYear() + years) }

  let months = (end.getFullYear() - cursor.getFullYear()) * 12 + end.getMonth() - cursor.getMonth()
  cursor = new Date(cursor.setMonth(cursor.getMonth() + months))
  if (cursor > end) { months--; cursor = new Date(start); cursor.setFullYear(cursor.getFullYear() + years); cursor.setMonth(cursor.getMonth() + months) }

  let remaining = end - cursor
  const days = Math.floor(remaining / 86400000)
  remaining -= days * 86400000
  const hours = Math.floor(remaining / 3600000)
  remaining -= hours * 3600000
  const minutes = Math.floor(remaining / 60000)
  remaining -= minutes * 60000
  const seconds = Math.floor(remaining / 1000)
  return { years, months, days, hours, minutes, seconds }
}

function sortPhotosByDateNumber(items) {
  return [...items].sort((a, b) => {
    const aNumber = Number(a.dateNumber)
    const bNumber = Number(b.dateNumber)

    if (Number.isFinite(aNumber) && aNumber > 0 && (!Number.isFinite(bNumber) || bNumber <= 0)) return -1
    if (Number.isFinite(bNumber) && bNumber > 0 && (!Number.isFinite(aNumber) || aNumber <= 0)) return 1
    if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && aNumber !== bNumber) return aNumber - bNumber

    const dateDifference = String(a.photoDate || '').localeCompare(String(b.photoDate || ''))
    if (dateDifference !== 0) return dateDifference
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
}

function App() {
  const [settings] = useState(loveSettings)
  const [now, setNow] = useState(new Date())
  const [photos, setPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [counterMode, setCounterMode] = useState('hours')
  const [pendingFiles, setPendingFiles] = useState([])
  const [uploadStatus, setUploadStatus] = useState('')
  const [dateNumber, setDateNumber] = useState('')
  const [photoDate, setPhotoDate] = useState(() => {
    const today = new Date()
    const offset = today.getTimezoneOffset()
    return new Date(today.getTime() - offset * 60000).toISOString().slice(0, 10)
  })
  const fileRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)

    async function loadGallery() {
      const [localPhotos, sharedResponse] = await Promise.all([
        getPhotos().catch(() => []),
        fetch(`${SUPABASE_URL}/rest/v1/photos?select=*&order=date_number.asc`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }).then((response) => response.ok ? response.json() : []).catch(() => []),
      ])

      const sharedPhotos = Array.isArray(sharedResponse)
        ? sharedResponse.map((photo) => ({
            id: photo.id,
            name: photo.name,
            url: photo.url,
            dateNumber: photo.date_number,
            photoDate: photo.photo_date,
            createdAt: Number(photo.created_at || 0),
            shared: true,
          }))
        : []

      const combined = [...sharedPhotos, ...localPhotos]
      const unique = [...new Map(combined.map((photo) => [photo.url || photo.id, photo])).values()]
      setPhotos(sortPhotosByDateNumber(unique))
    }

    loadGallery()
    return () => clearInterval(timer)
  }, [])

  const elapsed = differenceBetween(new Date(settings.startDate), now)
  const elapsedMilliseconds = Math.max(0, now - new Date(settings.startDate))
  const totalHours = Math.floor(elapsedMilliseconds / 3600000)
  const remainingMinutes = Math.floor((elapsedMilliseconds % 3600000) / 60000)
  const detailUnits = [
    ['Años', elapsed.years], ['Meses', elapsed.months], ['Días', elapsed.days],
  ]

  function choosePhotos(event) {
    const files = [...event.target.files].filter((file) => file.type.startsWith('image/'))
    if (files.length > 0) setPendingFiles(files)
    event.target.value = ''
  }

  async function uploadPhotos(event) {
    event.preventDefault()
    setUploadStatus('Subiendo recuerdos...')

    try {
      for (const [index, file] of pendingFiles.entries()) {
        const id = crypto.randomUUID()
        const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'jpg'
        const storagePath = `${id}.${extension}`

        const uploadResponse = await fetch(
          `${SUPABASE_URL}/storage/v1/object/${SUPABASE_PHOTOS_BUCKET}/${storagePath}`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              'x-upsert': 'true',
            },
            body: file,
          },
        )

        if (!uploadResponse.ok) {
          const error = await uploadResponse.text()
          throw new Error(error || 'Supabase rechazó la foto')
        }

        const url = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_PHOTOS_BUCKET}/${storagePath}`
        const photo = {
          id,
          name: file.name,
          url,
          dateNumber: dateNumber.trim(),
          photoDate,
          createdAt: Date.now() - index,
          shared: true,
        }

        const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/photos`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            id,
            name: photo.name,
            url,
            date_number: photo.dateNumber,
            photo_date: photo.photoDate,
            created_at: photo.createdAt,
          }),
        })

        if (!insertResponse.ok) {
          const error = await insertResponse.text()
          throw new Error(error || 'No se pudo guardar la foto en Supabase')
        }

        await savePhoto(photo)
        setPhotos((current) => sortPhotosByDateNumber([photo, ...current]))
      }

      setUploadStatus('¡Recuerdos compartidos!')
      setPendingFiles([])
      setDateNumber('')
      setTimeout(() => setUploadStatus(''), 2500)
    } catch (error) {
      setUploadStatus(`Error: ${error.message}`)
    }
  }

  async function removePhoto(photo) {
    if (photo.shared) {
      await fetch(`${SUPABASE_URL}/rest/v1/photos?id=eq.${encodeURIComponent(photo.id)}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      })

      const storagePath = photo.url?.split(`/object/public/${SUPABASE_PHOTOS_BUCKET}/`)[1]
      if (storagePath) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_PHOTOS_BUCKET}`, {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: [storagePath] }),
        })
      }
    }

    await deletePhoto(photo.id)
    setPhotos((current) => current.filter((item) => item.id !== photo.id))
    setSelectedPhoto(null)
  }

  return (
    <main className="app">
      <header className="nav">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span>♥</span> nuestro tiempo
        </button>
      </header>

      <section className="hero">
        <div className="fireworks" aria-hidden="true">
          <span className="firework firework-one" />
          <span className="firework firework-two" />
          <span className="firework firework-three" />
          <span className="firework firework-four" />
          <span className="firework firework-five" />
        </div>
        <p className="eyebrow">Nuestra historia comenzó hace</p>
        <h1>{settings.nameOne} <span>&</span> {settings.nameTwo}</h1>
        <p className="message">“{settings.message}”</p>

        <div className="counter-switch" aria-label="Tipo de contador">
          <button className={counterMode === 'hours' ? 'active' : ''} onClick={() => setCounterMode('hours')}>
            Horas
          </button>
          <button className={counterMode === 'date' ? 'active' : ''} onClick={() => setCounterMode('date')}>
            Tiempo juntos
          </button>
        </div>

        {counterMode === 'hours' ? (
          <div className="counter hours-counter">
            <div className="unit time-unit">
              <strong>{totalHours.toLocaleString('es-ES')}</strong>
              <span>{totalHours === 1 ? 'Hora' : 'Horas'}</span>
            </div>
            <div className="unit time-unit">
              <strong>{remainingMinutes.toLocaleString('es-ES')}</strong>
              <span>{remainingMinutes === 1 ? 'Minuto' : 'Minutos'}</span>
            </div>
          </div>
        ) : (
          <div className="detail-counter">
            {detailUnits.map(([label, value]) => (
              <div className="detail-unit" key={label}>
                <strong>{String(value).padStart(2, '0')}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="gallery-actions">
          <button className="upload-button" onClick={() => fileRef.current?.click()}>
            <span>＋</span> Añadir recuerdos
          </button>
        </div>
        <input ref={fileRef} className="hidden-input" type="file" accept="image/*" multiple onChange={choosePhotos} />
      </section>

      <section className="gallery-section">
        <div className="section-heading">
          <div><p className="eyebrow">Nuestra galería</p><h2>Momentos juntos</h2></div>
          <span>{photos.length} {photos.length === 1 ? 'recuerdo' : 'recuerdos'}</span>
        </div>

        {photos.length === 0 ? (
          <button className="empty-gallery" onClick={() => fileRef.current?.click()}>
            <div className="empty-icon">♡</div>
            <h3>Tu historia empieza aquí</h3>
            <p>Añade las primeras fotos de su viaje juntos</p>
          </button>
        ) : (
          <div className="gallery">
            {sortPhotosByDateNumber(photos).map((photo, index) => (
              <button className={`photo-card card-${index % 6}`} key={photo.id} onClick={() => setSelectedPhoto(photo)}>
                <img src={photo.url} alt={photo.name} />
                {(photo.dateNumber || photo.photoDate) && (
                  <div className="photo-card-info">
                    {photo.dateNumber && <strong>Cita {photo.dateNumber}</strong>}
                    {photo.photoDate && <span>{photo.photoDate.split('-').reverse().join('/')}</span>}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <footer>Hecho con <span>♥</span> para nosotros</footer>

      {selectedPhoto && (
        <div className="overlay photo-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSelectedPhoto(null)}>
          <div className="photo-modal">
            <button className="close" onClick={() => setSelectedPhoto(null)}>×</button>
            <img src={selectedPhoto.url} alt={selectedPhoto.name} />
            {(selectedPhoto.dateNumber || selectedPhoto.photoDate) && (
              <div className="photo-details">
                {selectedPhoto.dateNumber && <strong>Cita {selectedPhoto.dateNumber}</strong>}
                {selectedPhoto.photoDate && <span>{selectedPhoto.photoDate.split('-').reverse().join('/')}</span>}
              </div>
            )}
            <button className="delete-button" onClick={() => removePhoto(selectedPhoto)}>Eliminar recuerdo</button>
          </div>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && setPendingFiles([])}>
          <form className="modal photo-details-modal" onSubmit={uploadPhotos}>
            <button type="button" className="close" onClick={() => setPendingFiles([])}>×</button>
            <p className="eyebrow">Nuevo recuerdo</p>
            <h2>{pendingFiles.length === 1 ? 'Datos de la foto' : `${pendingFiles.length} fotos seleccionadas`}</h2>
            <label>Número de cita<input type="number" min="1" value={dateNumber} onChange={(event) => setDateNumber(event.target.value)} placeholder="Ej. 8" required /></label>
            <label>Fecha de la foto<input type="date" value={photoDate} onChange={(event) => setPhotoDate(event.target.value)} required /></label>
            <button className="save-button" type="submit" disabled={Boolean(uploadStatus)}>
              {uploadStatus || 'Guardar recuerdos'}
            </button>
          </form>
        </div>
      )}
    </main>
  )
}

export default App
