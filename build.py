import json
from pathlib import Path

root = Path(__file__).parent
template = (root / "page.template").read_text()
source = (root / "evidence.js").read_text()
samples = json.loads((root / "sample.json").read_text())
html = template.replace("/* ENGINE */", source).replace("/* SAMPLE */", json.dumps(samples, ensure_ascii=False).replace("</", "<\\/"))
(root / "Margin.html").write_text(html)
