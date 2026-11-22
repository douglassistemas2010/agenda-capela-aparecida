// Somente push: nenhum cache ou funcionamento offline.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {}
  event.waitUntil(
    self.registration.showNotification(
      data.title || "Nossa Senhora Aparecida",
      {
        body: data.body || "Há novidades na comunidade.",
        tag: data.tag || "comunidade",
        data: { url: self.registration.scope },
      },
    ),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients)
          if (client.url.startsWith(self.registration.scope))
            return client.focus();
        return self.clients.openWindow(self.registration.scope);
      }),
  );
});
