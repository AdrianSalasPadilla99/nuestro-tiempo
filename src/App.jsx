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

function App() {
  const [settings] = useState(loveSettings)
  const [now, setNow] = useState(new Date())
  const [photos, setPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [counterMode, setCounterMode] = useState('hours')
  const [pendingFiles, setPendingFiles] = useState([])
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
        fetch('./photos.json').then((response) => response.ok ? response.json() : []).catch(() => []),
      ])

      const sharedPhotos = Array.isArray(sharedResponse)
        ? sharedResponse.map((photo, index) => ({ ...photo, id: photo.id || `shared-${index}` }))
        : []

      setPhotos([...sharedPhotos, ...localPhotos])
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
    for (const file of pendingFiles) {
      const url = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const photo = {
        id: crypto.randomUUID(),
        name: file.name,
        url,
        dateNumber: dateNumber.trim(),
        photoDate,
        createdAt: Date.now(),
      }
      await savePhoto(photo)
      setPhotos((current) => [photo, ...current])
    }
    setPendingFiles([])
    setDateNumber('')
  }

  async function removePhoto(id) {
    await deletePhoto(id)
    setPhotos((current) => current.filter((photo) => photo.id !== id))
    setSelectedPhoto(null)
  }

  function exportGallery() {
    if (photos.length === 0) return

    const gallery = photos.map(({ id, name, url, dateNumber, photoDate, createdAt }) => ({ id, name, url, dateNumber, photoDate, createdAt }))
    const blob = new Blob([JSON.stringify(gallery, null, 2)], { type: 'application/json' })
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = 'photos.json'
    link.click()
    URL.revokeObjectURL(downloadUrl)
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
          {photos.length > 0 && (
            <button className="export-button" onClick={exportGallery}>
              Exportar galería
            </button>
          )}
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
            {photos.map((photo, index) => (
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
            <button className="delete-button" onClick={() => removePhoto(selectedPhoto.id)}>Eliminar recuerdo</button>
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
            <button className="save-button" type="submit">Guardar recuerdos</button>
          </form>
        </div>
      )}
    </main>
  )
}

export default App
