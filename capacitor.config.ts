import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pk.edu.vu.smartdeadlinemanager',
  appName: 'VU Smart Deadline Manager',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#38bdf8',
      sound: 'beep.wav',
    },
  },
};

export default config;
