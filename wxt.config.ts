import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ResultBoard',
    description: 'Turn Google results into a calm, organized research board.',
    version: '0.3.0',
    minimum_chrome_version: '116',
    permissions: ['storage', 'sidePanel', 'contextMenus'],
    icons: {
      '16': 'icon/icon-16.png',
      '32': 'icon/icon-32.png',
      '48': 'icon/icon-48.png',
      '128': 'icon/icon-128.png',
    },
    action: { default_title: 'ResultBoard', default_icon: 'icon/icon-32.png' },
    commands: {
      '_execute_side_panel': {
        suggested_key: { default: 'Alt+Shift+B', mac: 'MacCtrl+Shift+B' },
        description: 'Open ResultBoard side panel'
      },
      'open-board': {
        suggested_key: { default: 'Alt+Shift+R', mac: 'MacCtrl+Shift+R' },
        description: 'Open ResultBoard full board'
      },
      'toggle-keyboard-nav': {
        suggested_key: { default: 'Alt+Shift+K', mac: 'MacCtrl+Shift+K' },
        description: 'Toggle keyboard navigation on Google'
      }
    },
    homepage_url: 'https://github.com/clicklinc/ResultBoard'
  }
});
