import { admin } from '@libs/firebase/config'

export class UploadToStorageService {
  async execute(input: {
    buffer: Buffer | ArrayBuffer
    fileName: string
    mimeType: string
    path: string // e.g. 'billing-documents/condominiumId/fileName'
  }): Promise<{ url: string; fileName: string }> {
    const bucket = admin.storage().bucket()
    const file = bucket.file(input.path)

    const buf = input.buffer instanceof Buffer
      ? input.buffer
      : Buffer.from(new Uint8Array(input.buffer))
    await file.save(buf, {
      metadata: { contentType: input.mimeType },
    })

    await file.makePublic()
    const url = `https://storage.googleapis.com/${bucket.name}/${input.path}`

    return { url, fileName: input.fileName }
  }
}
