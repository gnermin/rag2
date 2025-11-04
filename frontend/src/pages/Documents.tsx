import { useState, useEffect } from 'react'
import AppLayout from '../ui/AppLayout'
import FileDropzone from '../components/FileDropzone'
import AgentTrace from '../components/AgentTrace'
import { documents } from '../lib/api'
import { formatBytes, formatDate, getStatusColor } from '../lib/utils'

interface Document {
  id: string
  filename: string
  status: string
  mime_type?: string
  file_size?: number
  metadata: any
  created_at: string
  agent_logs?: any[]
}

export default function Documents() {
  const [docs, setDocs] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [success, setSuccess] = useState('')

  const fetchDocuments = async () => {
    try {
      const response = await documents.list()
      setDocs(response.data.documents)
    } catch (err: any) {
      console.error('Error fetching documents:', err)
    }
  }

  useEffect(() => {
    fetchDocuments()
    const interval = setInterval(fetchDocuments, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleFileSelect = async (file: File) => {
    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const response = await documents.upload(file)
      setDocs([response.data, ...docs])
      setSelectedDoc(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj dokument? Svi chunk-ovi i veze će biti trajno obrisani.')) {
      return
    }

    setDeleting(true)
    setError('')
    setSuccess('')

    try {
      const response = await documents.delete(docId)
      setSuccess(response.data.message)
      setDocs(docs.filter(d => d.id !== docId))
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Brisanje nije uspjelo')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm(`Da li ste sigurni da želite obrisati SVE dokumente (${docs.length})? Svi chunk-ovi i veze će biti trajno obrisani. Ova akcija se ne može poništiti!`)) {
      return
    }

    setDeleting(true)
    setError('')
    setSuccess('')

    try {
      const response = await documents.deleteAll()
      setSuccess(response.data.message)
      setDocs([])
      setSelectedDoc(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Brisanje nije uspjelo')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppLayout>
      {/* Glavni container centriran globalno */}
      <div className="mx-auto max-w-6xl w-full px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Dokumenti</h1>

        {/* Dinamični grid: 2 kolone kad postoji desni panel, inače 1 kolona i centriraj lijevu */}
        <div
          className={`grid gap-6 ${
            selectedDoc
              ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
              : 'lg:grid-cols-1'
          }`}
        >
          {/* Lijevi stupac */}
          <div className={`space-y-6 ${!selectedDoc ? 'max-w-3xl mx-auto w-full' : ''}`}>
            <FileDropzone onFileSelect={handleFileSelect} uploading={uploading} />

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 p-4 rounded-lg">
                ✅ {success}
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Vaši Dokumenti ({docs.length})</h2>
                {docs.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {deleting ? '⏳ Brisanje...' : '🗑️ Obriši Sve'}
                  </button>
                )}
              </div>

              {docs.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Još nema dokumenata. Učitajte jedan da počnete!</p>
              ) : (
                <div className="space-y-3">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 rounded-lg border transition-all ${
                        selectedDoc?.id === doc.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                          <h3 className="font-medium text-slate-900">{doc.filename}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                            {doc.file_size && <span>{formatBytes(doc.file_size)}</span>}
                            <span>{formatDate(doc.created_at)}</span>
                            {doc.metadata?.chunks && <span>📦 {doc.metadata.chunks} chunk-ova</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(doc.status)}`}>
                            {doc.status}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(doc.id)
                            }}
                            disabled={deleting}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            title="Obriši dokument"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desni stupac – samo kad postoji selektovan dokument */}
          {selectedDoc && (
            <div>
              <AgentTrace
                logs={selectedDoc.agent_logs || []}
                metadata={selectedDoc.metadata}
              />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
