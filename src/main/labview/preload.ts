import { EventTypeMain, EventTypeRenderer } from '../eventtypes';
import { installDesktopLauncher } from './desktoplauncher';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getServerInfo: () => {
    return ipcRenderer.invoke(EventTypeMain.GetServerInfo);
  },
  broadcastLabUIReady: () => {
    ipcRenderer.send(EventTypeMain.LabUIReady);
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  const info = await ipcRenderer.invoke(EventTypeMain.GetServerInfo);
  if (info?.nativeDesktop) {
    const setStarting = installDesktopLauncher(
      document,
      () => ipcRenderer.send(EventTypeMain.OpenNativeDesktop),
      info.nativeDesktopStarting
    );
    const update = (_event: Electron.IpcRendererEvent, starting: boolean) =>
      setStarting(starting);
    ipcRenderer.on(EventTypeRenderer.NativeDesktopStarting, update);
    window.addEventListener(
      'unload',
      () => {
        ipcRenderer.removeListener(
          EventTypeRenderer.NativeDesktopStarting,
          update
        );
      },
      { once: true }
    );
  }
});

export {};
