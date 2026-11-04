import nodemailer from 'nodemailer';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** SMTP via a Turkey-based provider (spec §4.2). */
export function smtpMailer(url: string, from: string): Mailer {
  const transport = nodemailer.createTransport(url);
  return {
    async send(m) {
      await transport.sendMail({ from, to: m.to, subject: m.subject, text: m.text });
    },
  };
}

/** Dev/test: keeps mails in memory and prints a short line (no full address in logs). */
export function memoryMailer(
  log?: (msg: string) => void,
): Mailer & { outbox: Mail[]; last(to: string): Mail | undefined } {
  const outbox: Mail[] = [];
  return {
    outbox,
    async send(m) {
      outbox.push(m);
      log?.(`[mail] ${m.subject} → ${m.to.replace(/^(.).*(@.*)$/, '$1***$2')}\n${m.text}`);
    },
    last(to) {
      return [...outbox].reverse().find((m) => m.to === to);
    },
  };
}
