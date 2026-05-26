const ALARM_NAME = 'llm-overlay-keepalive';

export function startKeepAlive(): void {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.45 });
}

export function stopKeepAlive(): void {
  chrome.alarms.clear(ALARM_NAME);
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) {
    void chrome.runtime.getPlatformInfo();
  }
});
