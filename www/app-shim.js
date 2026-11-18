/* Babar Azam Stats Book — offline runtime for the Android app.
   Replaces the claude.ai page runtime (window.claude) with storage on the phone,
   and adds the Update button that pulls new versions from GitHub. */
(function () {
  "use strict";
  var REPO = "hassan4500678-ux/Fb-";
  var RAW = "https://raw.githubusercontent.com/" + REPO + "/babar-stats-app/www/";
  var BUNDLED_PHOTO = { "4972190823e57b4689673dc852bd3f23": "babar-photo.jpg" };
  var KEY_DB = "bsb_db", KEY_DATA_VER = "bsb_data_ver", KEY_APP_VER = "bsb_app_ver";

  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var clone = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };
  var rid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); };

  /* ---------- local database ---------- */
  var DB = null, loading = null;
  var collSubs = {}, docSubs = {};
  function load() {
    if (DB) return Promise.resolve(DB);
    if (loading) return loading;
    var saved = LS.get(KEY_DB);
    if (saved) { try { DB = JSON.parse(saved); return Promise.resolve(DB); } catch (e) {} }
    loading = fetch("data.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      DB = j.collections || {};
      persist();
      if (!LS.get(KEY_DATA_VER)) LS.set(KEY_DATA_VER, String(j.version || 0));
      return DB;
    });
    return loading;
  }
  function persist() { if (!LS.set(KEY_DB, JSON.stringify(DB))) console.warn("Storage full"); }
  function snapOf(c) {
    var m = DB[c] || {};
    return { docs: Object.keys(m).map(function (id) { return { id: id, data: function () { return clone(m[id]); } }; }) };
  }
  function docSnap(c, id) {
    var m = DB[c] || {}, has = Object.prototype.hasOwnProperty.call(m, id);
    return { id: id, exists: has, data: function () { return has ? clone(m[id]) : undefined; } };
  }
  function emit(c) {
    (collSubs[c] || []).forEach(function (cb) { try { cb(snapOf(c)); } catch (e) { console.error(e); } });
    Object.keys(docSubs).forEach(function (p) {
      if (p.indexOf(c + "/") === 0) {
        var id = p.slice(c.length + 1);
        docSubs[p].forEach(function (cb) { try { cb(docSnap(c, id)); } catch (e) { console.error(e); } });
      }
    });
  }
  function docRef(c, id) {
    return {
      id: id,
      set: function (d) { DB[c] = DB[c] || {}; DB[c][id] = clone(d); persist(); emit(c); return Promise.resolve(); },
      update: function (d) {
        DB[c] = DB[c] || {}; var cur = DB[c][id] || {}, nd = clone(d);
        Object.keys(nd).forEach(function (k) { if (nd[k] && nd[k].__delete__) delete cur[k]; else cur[k] = nd[k]; });
        DB[c][id] = cur; persist(); emit(c); return Promise.resolve();
      },
      delete: function () { if (DB[c]) delete DB[c][id]; persist(); emit(c); return Promise.resolve(); },
      get: function () { return Promise.resolve(docSnap(c, id)); },
      onSnapshot: function (cb) {
        var p = c + "/" + id; (docSubs[p] = docSubs[p] || []).push(cb);
        setTimeout(function () { cb(docSnap(c, id)); }, 0);
        return function () { docSubs[p] = docSubs[p].filter(function (x) { return x !== cb; }); };
      }
    };
  }
  var db = {
    collection: function (c) {
      return {
        doc: function (id) { return docRef(c, id); },
        add: function (d) { var id = rid(); return docRef(c, id).set(d).then(function () { return { id: id }; }); },
        onSnapshot: function (cb) {
          (collSubs[c] = collSubs[c] || []).push(cb);
          setTimeout(function () { cb(snapOf(c)); }, 0);
          return function () { collSubs[c] = collSubs[c].filter(function (x) { return x !== cb; }); };
        }
      };
    },
    doc: function (path) { var i = path.indexOf("/"); return docRef(path.slice(0, i), path.slice(i + 1)); }
  };

  /* ---------- photos ---------- */
  window.__blobUrl = function (id) {
    if (BUNDLED_PHOTO[id]) return BUNDLED_PHOTO[id];
    return LS.get("bsb_blob_" + id) || "";
  };
  function shrink(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error("Could not read the photo")); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { rej(new Error("That file is not a photo")); };
        im.onload = function () {
          var s = Math.min(1, 1000 / Math.max(im.width, im.height));
          var c = document.createElement("canvas"); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL("image/jpeg", 0.85));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  var assets = {
    upload: function (file) {
      return shrink(file).then(function (url) {
        var id = "local" + rid();
        if (!LS.set("bsb_blob_" + id, url)) throw new Error("Phone storage is full");
        return { id: id, url: url, sizeBytes: url.length, contentType: "image/jpeg" };
      });
    },
    list: function () { return Promise.resolve({ assets: [], usage: {} }); },
    delete: function () { return Promise.resolve(); }
  };

  /* ---------- saving the card image ---------- */
  var downloads = {
    save: function (o) {
      return new Promise(function (res, rej) {
        if (!window.AndroidBridge) return rej({ code: "unavailable", message: "Saving works inside the app" });
        var fr = new FileReader();
        fr.onload = function () {
          var b64 = String(fr.result).split(",")[1];
          var out = window.AndroidBridge.saveDownload(o.filename || "babar-azam.png", b64, (o.data && o.data.type) || "image/png");
          if (out && out.indexOf("ok") === 0) { toast("Saved to Downloads"); res(); } else rej({ code: "failed", message: out || "Could not save" });
        };
        fr.readAsDataURL(o.data);
      });
    }
  };

  var user = {
    isOwner: function () { return true; }, canEdit: function () { return true; },
    can: function () { return true; }, id: function () { return Promise.resolve("phone"); },
    me: function () { return Promise.resolve({ id: "phone", name: "You" }); },
    profiles: function () { return Promise.resolve({}); }
  };

  window.claude = {
    use: function (name) {
      if (name === "db") return load().then(function () { return db; });
      if (name === "user") return Promise.resolve(user);
      if (name === "assets") return Promise.resolve(assets);
      if (name === "downloads") return Promise.resolve(downloads);
      return Promise.resolve(null);
    }
  };

  /* ---------- Update button ---------- */
  function toast(m) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 3200);
  }
  function localVersions() {
    return fetch("version.json", { cache: "no-store" }).then(function (r) { return r.json(); }).catch(function () { return { app: 0, data: 0 }; })
      .then(function (v) {
        return { app: Number(LS.get(KEY_APP_VER) || v.app || 0), data: Number(LS.get(KEY_DATA_VER) || v.data || 0) };
      });
  }
  function remote(path) {
    return fetch(RAW + path + "?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("GitHub said " + r.status);
      return r;
    });
  }
  function sheet(html) {
    var box = document.createElement("div");
    box.className = "sheet"; box.id = "bsbUpd";
    box.innerHTML = '<div class="box" style="max-width:460px">' + html + "</div>";
    document.body.appendChild(box);
    return box;
  }
  function closeSheet() { var b = document.getElementById("bsbUpd"); if (b) b.remove(); }

  function checkUpdate(manual) {
    var btn = document.getElementById("bsbUpdateBtn");
    if (manual && btn) { btn.disabled = true; btn.textContent = "Checking…"; }
    Promise.all([localVersions(), remote("version.json").then(function (r) { return r.json(); })]).then(function (v) {
      var mine = v[0], latest = v[1];
      var appNew = Number(latest.app || 0) > mine.app, dataNew = Number(latest.data || 0) > mine.data;
      if (btn) { btn.disabled = false; btn.textContent = appNew || dataNew ? "Update ●" : "Update"; }
      if (!appNew && !dataNew) { if (manual) toast("You have the latest version"); return; }
      if (!manual) return;
      var notes = latest.notes ? '<p class="hint" style="margin:8px 0 0">' + String(latest.notes).replace(/[<>&]/g, "") + "</p>" : "";
      var s = sheet('<h3>Update available</h3>' + notes +
        (appNew ? '<p style="margin:12px 0 0">New design and features are ready.</p>' : "") +
        (dataNew ? '<label style="display:flex;gap:10px;align-items:flex-start;margin-top:14px;cursor:pointer"><input type="checkbox" id="bsbTakeData" checked style="margin-top:4px"><span>Also replace the stats on this phone with the latest stats from the Stats Book.<span class="hint" style="display:block">Untick to keep the numbers you edited on this phone.</span></span></label>' : "") +
        '<div class="row-actions"><button class="btn ghost" type="button" id="bsbLater">Later</button><button class="btn" type="button" id="bsbGo">Update now</button></div>');
      s.querySelector("#bsbLater").onclick = closeSheet;
      s.querySelector("#bsbGo").onclick = function () {
        var go = s.querySelector("#bsbGo"); go.disabled = true; go.textContent = "Updating…";
        var takeData = dataNew && s.querySelector("#bsbTakeData") && s.querySelector("#bsbTakeData").checked;
        var jobs = [];
        if (appNew) {
          (latest.files || ["index.html", "app-shim.js"]).forEach(function (f) {
            jobs.push(remote(f).then(function (r) { return r.text(); }).then(function (txt) {
              if (!window.AndroidBridge) throw new Error("Updates work inside the app");
              var out = window.AndroidBridge.saveFile(f, txt);
              if (out !== "ok") throw new Error(out);
            }));
          });
        }
        if (takeData) {
          jobs.push(remote("data.json").then(function (r) { return r.json(); }).then(function (j) {
            DB = j.collections || {}; persist(); LS.set(KEY_DATA_VER, String(j.version || latest.data));
          }));
        } else if (dataNew) { LS.set(KEY_DATA_VER, String(latest.data)); }
        Promise.all(jobs).then(function () {
          if (appNew) LS.set(KEY_APP_VER, String(latest.app));
          go.textContent = "Done — restarting";
          setTimeout(function () { location.reload(); }, 500);
        }).catch(function (e) {
          go.disabled = false; go.textContent = "Try again";
          toast("Update failed: " + (e && e.message ? e.message : e) + ". Check the internet and try again.");
        });
      };
    }).catch(function () {
      if (btn) { btn.disabled = false; btn.textContent = "Update"; }
      if (manual) toast("No internet, or GitHub could not be reached. Try again later.");
    });
  }

  function addButton() {
    var b = document.createElement("button");
    b.id = "bsbUpdateBtn"; b.type = "button"; b.className = "btn small"; b.textContent = "Update";
    b.style.cssText = "position:fixed;z-index:15;right:calc(14px + env(safe-area-inset-right,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));box-shadow:0 6px 18px rgba(0,0,0,.45)";
    b.onclick = function () { checkUpdate(true); };
    document.body.appendChild(b);
    setTimeout(function () { checkUpdate(false); }, 2500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addButton); else addButton();
})();
