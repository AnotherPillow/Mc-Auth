import { Router } from 'express';
import { getPageGenerator } from '../../Constants';
import { handleRequestRestfully } from '@spraxdev/node-commons';

export default class SettingsBaseRoutes {
  static addRoutes(router: Router): void {
    router.all('/', (req, res, next) => {
      handleRequestRestfully(req, res, next, {
        get: () => res.redirect(`${getPageGenerator().globals.url.base}/settings/account`)
      });
    });
  }
}
