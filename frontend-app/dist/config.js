(function (window) {
  const existing = window.__STUDYROOM_RUNTIME__ || {};
  const hasOwn = Object.prototype.hasOwnProperty;

  function pick(keys, fallback) {
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (hasOwn.call(existing, key) && existing[key] != null) {
        return existing[key];
      }
    }
    return fallback;
  }

  function trimTrailingSlash(value) {
    return String(value == null ? "" : value).replace(/\/+$/, "");
  }

  var apiBase = trimTrailingSlash(
    pick(["apiBase", "API_BASE_URL", "backendBase", "BACKEND_BASE_URL"], "http://localhost:48080")
  );
  var adminApiBase = trimTrailingSlash(
    pick(["adminApiBase", "ADMIN_API_BASE_URL"], apiBase ? apiBase + "/admin-api" : "/admin-api")
  );
  var appApiBase = trimTrailingSlash(
    pick(["appApiBase", "APP_API_BASE_URL"], apiBase ? apiBase + "/app-api" : "/app-api")
  );
  var infraUploadUrl = trimTrailingSlash(
    pick(["infraUploadUrl", "INFRA_UPLOAD_URL"], adminApiBase + "/infra/file/upload")
  );

  window.__STUDYROOM_RUNTIME__ = Object.assign({}, existing, {
    apiBase: apiBase,
    adminApiBase: adminApiBase,
    appApiBase: appApiBase,
    infraUploadUrl: infraUploadUrl,
  });
})(window);
