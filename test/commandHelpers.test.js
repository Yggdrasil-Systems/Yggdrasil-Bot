import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getDashboardUrl } from '../src/commands/utility/dashboard.js';
import { getService } from '../src/commands/setup/noprefix.js';

test('dashboard command resolves runtime URL from app context first', () => {
  const source = {
    appContext: {
      runtimeConfig: {
        dashboardUrl: 'https://dashboard.example'
      }
    }
  };

  assert.equal(getDashboardUrl(source), 'https://dashboard.example');
});

test('noprefix command resolves the no-prefix service from app context first', () => {
  const appContextService = { id: 'app-context' };
  const fallbackService = { id: 'fallback' };

  assert.equal(getService({
    appContext: { noPrefixService: appContextService },
    client: { noPrefixService: fallbackService }
  }), appContextService);

  assert.equal(getService({
    client: { noPrefixService: fallbackService }
  }), fallbackService);
});
