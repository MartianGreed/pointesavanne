import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Download, Upload, FileCheck, Loader2, Calendar, Users, CreditCard } from 'lucide-react'
import { api } from '../api/client'

export function BookingPage() {
  const { id } = useParams({ from: '/booking/$id' })
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { data: quotation, isLoading, error } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => api.getQuotation(id),
    refetchInterval: (data) =>
      data?.state?.data?.status === 'quotation-requested' ? 5000 : false,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadSignedQuotation(id, file),
    onSuccess: () => {
      navigate({ to: '/confirmation/$id', params: { id } })
    },
    onError: (err: Error) => {
      setUploadError(err.message)
    },
  })

  const handleDownloadPdf = async () => {
    try {
      const blob = await api.downloadQuotationPdf(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation-${quotation?.numericId || id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download PDF:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadError('Please upload a PDF file')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB')
        return
      }
      setUploadError(null)
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-luxury-gold" />
      </div>
    )
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif mb-4">Quotation Not Found</h2>
          <p className="text-gray-600 mb-6">The requested quotation could not be found.</p>
          <button onClick={() => navigate({ to: '/' })} className="btn-primary">
            Return Home
          </button>
        </div>
      </div>
    )
  }

  const isPending = quotation.status === 'quotation-requested'
  const isAwaitingSignature = quotation.status === 'quotation-awaiting-acceptation'
  const isSigned = quotation.status === 'quotation-signed'

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-luxury-gold text-sm tracking-[0.2em] mb-4">
            QUOTATION #{quotation.numericId}
          </p>
          <h1 className="section-heading text-3xl">Your Booking</h1>
        </div>

        {/* Status Banner */}
        <div
          className={`p-6 rounded-lg mb-8 ${
            isPending
              ? 'bg-yellow-50 border border-yellow-200'
              : isAwaitingSignature
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-green-50 border border-green-200'
          }`}
        >
          <div className="flex items-center gap-4">
            {isPending ? (
              <>
                <Loader2 className="w-6 h-6 text-yellow-600 animate-spin" />
                <div>
                  <h3 className="font-medium text-yellow-800">Preparing Your Quotation</h3>
                  <p className="text-yellow-600 text-sm">
                    We&apos;re generating your personalized quotation. This usually takes just a moment.
                  </p>
                </div>
              </>
            ) : isAwaitingSignature ? (
              <>
                <Download className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-800">Ready for Your Signature</h3>
                  <p className="text-blue-600 text-sm">
                    Download, review, sign, and upload your quotation to confirm your booking.
                  </p>
                </div>
              </>
            ) : (
              <>
                <FileCheck className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-800">Quotation Signed</h3>
                  <p className="text-green-600 text-sm">
                    Your signed quotation has been received. We&apos;ll be in touch shortly.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quotation Details */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="font-serif text-2xl mb-6">Booking Summary</h2>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-start gap-4">
              <Calendar className="w-5 h-5 text-luxury-gold mt-1" />
              <div>
                <p className="text-sm text-gray-500 mb-1">Dates</p>
                <p className="font-medium">{quotation.from}</p>
                <p className="text-gray-600">to {quotation.to}</p>
                <p className="text-sm text-luxury-gold mt-1">{quotation.pricing.nightsIn} nights</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Users className="w-5 h-5 text-luxury-gold mt-1" />
              <div>
                <p className="text-sm text-gray-500 mb-1">Guests</p>
                <p className="font-medium">{quotation.adultsCount} Adults</p>
                {quotation.childrenCount > 0 && (
                  <p className="text-gray-600">{quotation.childrenCount} Children</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CreditCard className="w-5 h-5 text-luxury-gold mt-1" />
              <div>
                <p className="text-sm text-gray-500 mb-1">Total</p>
                <p className="font-serif text-2xl text-luxury-gold">
                  {quotation.pricing.totalAmount.formatted}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-medium mb-4">Price Breakdown</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Accommodation ({quotation.pricing.nightsIn} nights)</span>
                <span>{quotation.pricing.totalAmount.formatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Household fee</span>
                <span>{quotation.pricing.householdTax.formatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tourist tax</span>
                <span>{quotation.pricing.touristTax.formatted}</span>
              </div>
              {quotation.pricing.discount && quotation.pricing.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Extended stay discount</span>
                  <span>-{quotation.pricing.discount}%</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-3 border-t">
                <span>Total</span>
                <span className="text-luxury-gold">{quotation.pricing.totalAmount.formatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isAwaitingSignature && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="font-serif text-2xl mb-6">Complete Your Booking</h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Download Section */}
              <div className="p-6 border rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-luxury-gold/10 flex items-center justify-center">
                    <span className="text-luxury-gold font-medium">1</span>
                  </div>
                  <h3 className="font-medium">Download & Sign</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Download your quotation, review the terms, and sign the document.
                </p>
                <button onClick={handleDownloadPdf} className="btn-secondary w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </button>
              </div>

              {/* Upload Section */}
              <div className="p-6 border rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-luxury-gold/10 flex items-center justify-center">
                    <span className="text-luxury-gold font-medium">2</span>
                  </div>
                  <h3 className="font-medium">Upload Signed Quotation</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Once signed, upload the document to confirm your booking.
                </p>

                <div className="mb-4">
                  <label className="block">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-luxury-gold transition-colors">
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2 text-luxury-gold">
                          <FileCheck className="w-5 h-5" />
                          <span className="text-sm">{selectedFile.name}</span>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          <Upload className="w-6 h-6 mx-auto mb-2" />
                          <span className="text-sm">Click to select PDF</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {uploadError && (
                  <p className="text-red-500 text-sm mb-4">{uploadError}</p>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Signed Quotation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {isSigned && (
          <div className="text-center">
            <button onClick={() => navigate({ to: '/' })} className="btn-primary">
              Return Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
