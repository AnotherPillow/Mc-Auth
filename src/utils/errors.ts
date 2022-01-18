import { type as osType } from 'os';
import { post as httpPost } from 'superagent';

import { ApiErrTemplate } from './ApiErrs';

export class ApiError extends Error {
  private static webhookRequestsLeft: number = 10;

  readonly httpCode: number;
  readonly internalDetails: object | null;

  constructor(httpCode: number, message: string, logErr: boolean | 'console' | 'discord' = false, internalDetails: object | null = null, stack?: string) {
    super(message);

    if (typeof stack == 'string') {
      this.stack = stack;
    }

    this.httpCode = httpCode;
    this.internalDetails = internalDetails;

    ApiError.log(this.httpCode, this.message, logErr, this.internalDetails, this.stack)
        .catch(console.error);
  }

  static fromError(err: Error, httpCode: number = 500, logErr: boolean | 'console' | 'discord' = true, internalDetails: object | null = null): ApiError {
    if (err.message) {
      if (!internalDetails) {
        internalDetails = {message: err.message};
      } else {
        const key = (internalDetails as any).message ? `message_${Date.now()}` : 'message';

        (internalDetails as any)[key] = err.message;
      }
    }

    return new ApiError(httpCode, 'An error occurred', logErr, internalDetails, err.stack);
  }

  static create(err: ApiErrTemplate, internalDetails: object | null = null): ApiError {
    return new ApiError(err.httpCode, err.message, err.logErr, internalDetails);
  }

  static async log(httpCode: number, message: string, logMode: boolean | 'console' | 'discord' = false, internalDetails: object | null = null, stack?: string): Promise<void> {
    return new Promise((resolve, _reject) => {
      if (!logMode) return resolve();

      if (logMode == true || logMode == 'console') {
        console.error(`[Error] ${message} (${JSON.stringify({ srvTime: new Date().toUTCString(), stack: stack?.split('\n'), details: internalDetails }, null, 2)})`);
      }

      if (logMode == true || logMode == 'discord') {
        const cfg = require('..').cfg;
        if (ApiError.webhookRequestsLeft > 0 && cfg && cfg.logging.discordErrorWebHookURL) {
          httpPost(cfg.logging.discordErrorWebHookURL)
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json')
              .set('User-Agent', this.getUserAgent())
              .send({
                username: 'Mc-Auth.org (Error-Reporter)',
                avatar_url: 'https://cdn.discordapp.com/attachments/541917740135350272/743868648611119204/Mc-Auth-4096px.png',
                embeds: [
                  {
                    title: 'An error occurred',
                    fields: [
                      {
                        name: 'HTTP-Code',
                        value: httpCode,
                        inline: true
                      },
                      {
                        name: 'Message',
                        value: message,
                        inline: true
                      },
                      {
                        name: 'Details',
                        value: internalDetails ? '```JS\n' + JSON.stringify(internalDetails, null, 2).replace(/\\r?\\n/g, '\n') + '\n```' : '-'
                      }
                    ]
                  }
                ]
              })
              .end((err, res) => {
                if (err) return console.error('Discord WebHook err:', err);
                // TODO: write to 'webhookRequestsLeft' and use setTimeout() to automatically set it when RateLimit is over (https://discord.com/developers/docs/topics/rate-limits#header-format)
                console.log(`Discord WebHook (${res.status}):`, res.text); // TODO: remove debug
              });
        }
      }
    });
  }

  static getUserAgent() {
    return `MC-Auth.org/${require('..').appVersion} (${osType()}; ${process.arch}; ${process.platform}) (+https://github.com/Mc-Auth-com/Mc-Auth-Web#readme)`;
  }
}
