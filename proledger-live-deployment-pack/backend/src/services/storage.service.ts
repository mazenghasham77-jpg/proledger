type UploadMeta = {
  fileName: string;
  contentType?: string;
  contentBase64: string;
};

export async function uploadFile(meta: UploadMeta) {
  return {
    uploaded: false,
    simulated: true,
    storageKey: `simulated/${Date.now()}-${meta.fileName}`,
    message: "Connect S3-compatible storage here for real uploads.",
  };
}
