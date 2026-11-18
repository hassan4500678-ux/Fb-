"""Build www/ from the Stats Book page and its exported data.
usage: python3 tools/build_www.py PAGE.html EXPORT_DIR APP_VERSION DATA_VERSION "notes" """
import json, os, sys, glob
page, export, appv, datav, notes = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "www")
head = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="theme-color" content="#07140F">'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'body{margin:0;font:14px/1.4 system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
        '<script src="app-shim.js"></script></head><body>')
html = head + open(page, encoding="utf-8").read() + "</body></html>"
open(os.path.join(root, "index.html"), "w", encoding="utf-8").write(html)
cols = {}
for d in sorted(os.listdir(export)):
    p = os.path.join(export, d)
    if not os.path.isdir(p): continue
    cols[d] = {os.path.basename(f)[:-5]: json.load(open(f, encoding="utf-8")) for f in sorted(glob.glob(p + "/*.json"))}
json.dump({"version": datav, "collections": cols}, open(os.path.join(root, "data.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump({"app": appv, "data": datav, "files": ["index.html", "app-shim.js"], "notes": notes},
          open(os.path.join(root, "version.json"), "w", encoding="utf-8"), indent=1)
print("built", {k: len(v) for k, v in cols.items()}, "app", appv, "data", datav)
