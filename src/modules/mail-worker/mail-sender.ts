import { createTransport, type Transporter } from 'nodemailer';

export type SendMailOptions = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

export type MailSender = {
  sendMail(options: SendMailOptions): Promise<void>;
};

export function createMailSender(): MailSender {
  const host = process.env.MAIL_HOST;
  if (!host) {
    return {
      async sendMail(options: SendMailOptions) {
        console.debug(
          `[mail] skipped (MAIL_HOST unset): to=${JSON.stringify(options.to)} subject=${options.subject}`,
        );
      },
    };
  }

  const port = Number(process.env.MAIL_PORT ?? '1025');
  const secure = process.env.MAIL_SECURE === 'true';
  const user = process.env.MAIL_USER ?? '';
  const password = process.env.MAIL_PASSWORD ?? '';

  const transporter: Transporter = createTransport({
    host,
    port,
    secure,
    auth:
      user && password
        ? {
            user,
            pass: password,
          }
        : undefined,
  });

  const from = process.env.MAIL_FROM ?? 'noreply@localhost';

  return {
    async sendMail(options: SendMailOptions) {
      await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      console.log(
        `[mail] sent: to=${JSON.stringify(options.to)} subject=${options.subject}`,
      );
    },
  };
}
