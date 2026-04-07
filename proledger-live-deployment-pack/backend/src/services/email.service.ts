type SendMailParams = {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
};

export async function sendMail(params: SendMailParams) {
  return {
    delivered: false,
    simulated: true,
    to: params.to,
    subject: params.subject,
    message: "Email provider not configured in starter package. This is the integration foundation.",
  };
}
