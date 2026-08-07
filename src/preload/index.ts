import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion')
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
