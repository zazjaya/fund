/**
 * localStorage 管理工具
 */

const STORAGE_PREFIX = 'fundMonitor_'

export const STORAGE_KEYS = {
  VALID_KEY: 'ValidKey',
  USER_CONFIG: 'UserConfig',
  DATA_VERSION: 'DataVersion'
}

export function getStorageKey(key) {
  return STORAGE_PREFIX + key
}

export function getStorage(key) {
  try {
    const data = localStorage.getItem(getStorageKey(key))
    return data ? JSON.parse(data) : null
  } catch (e) {
    return null
  }
}

export function setStorage(key, value) {
  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(value))
    return true
  } catch (e) {
    return false
  }
}

export function removeStorage(key) {
  try {
    localStorage.removeItem(getStorageKey(key))
    return true
  } catch (e) {
    return false
  }
}

export function clearAllStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    removeStorage(key)
  })
}