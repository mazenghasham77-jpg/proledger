export const providerConfig = {
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  storage: {
    bucket: process.env.STORAGE_BUCKET || "",
    region: process.env.STORAGE_REGION || "",
    accessKey: process.env.STORAGE_ACCESS_KEY || "",
    secretKey: process.env.STORAGE_SECRET_KEY || "",
  },
};
